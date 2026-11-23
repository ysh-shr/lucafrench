"use client";

import { useEffect, useRef, useState } from "react";
import { conversations, type Conversation } from "@/data/questions";
import { evaluate, type AnswerFeedback } from "@/lib/evaluate";
import { canRecord, playSpeech, prefetchSpeech, startRecording, stopSpeech, unlockAudio, type Recording } from "@/lib/voice-client";

type AppMode = "menu" | "practice" | "sequence";
type SequencePhase = "question" | "answer";
type VoiceEngine = "openai" | "browser";

const QUESTION_RATE = 0.78;
const ANSWER_RATE = 0.72;
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function Practice() {
  const [mode, setMode] = useState<AppMode>("menu");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [voice, setVoice] = useState<VoiceEngine>("browser");
  const [error, setError] = useState<string | null>(null);
  const [sequencePhase, setSequencePhase] = useState<SequencePhase>("question");
  const [sequencePlaying, setSequencePlaying] = useState(false);
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  const recordingTokenRef = useRef(0);
  const sequenceRunRef = useRef(0);
  const questions = conversation?.questions ?? [];
  const question = questions[questionIndex];

  useEffect(() => {
    const browserRecognition = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    setSpeechSupported(browserRecognition);
    let active = true;
    fetch("/api/voice-status")
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((status: { enabled?: boolean }) => {
        if (!active || !status.enabled) return;
        setVoice("openai");
        setSpeechSupported(canRecord() || browserRecognition);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      sequenceRunRef.current += 1;
      cancelRecording();
      stopAllSpeech();
    };
  }, []);

  function stopAllSpeech() {
    stopSpeech();
    window.speechSynthesis?.cancel();
  }

  function makeUtterance(text: string, rate: number) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = rate;
    const frenchVoice = window.speechSynthesis.getVoices().find((item) => item.lang === "fr-FR");
    if (frenchVoice) utterance.voice = frenchVoice;
    return utterance;
  }

  /** Browser speech as a promise. Stays pending if cancelled; callers check their run id. */
  function sayWithBrowser(text: string, rate: number): Promise<void> {
    if (!("speechSynthesis" in window)) return Promise.reject(new Error("no speech synthesis"));
    return new Promise((resolve, reject) => {
      const utterance = makeUtterance(text, rate);
      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        if (event.error !== "interrupted" && event.error !== "canceled") reject(new Error(event.error));
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  /** Speaks with OpenAI when configured, falling back to the browser voice on any failure. */
  async function say(text: string, rate: number): Promise<void> {
    if (voice === "openai") {
      try {
        await playSpeech(text, rate < 0.75);
        return;
      } catch {
        // fall through to the browser voice
      }
    }
    await sayWithBrowser(text, rate);
  }

  function speak(text: string, rate = QUESTION_RATE) {
    unlockAudio();
    stopAllSpeech();
    say(text, rate).catch(() => setError("La lecture audio n’est pas disponible dans ce navigateur."));
  }

  async function runSequence(run: number) {
    const isCurrent = () => sequenceRunRef.current === run;
    try {
      for (let index = 0; index < questions.length; index += 1) {
        if (!isCurrent()) return;
        const item = questions[index];
        setQuestionIndex(index);
        setSequencePhase("question");
        if (voice === "openai") prefetchSpeech(item.examples[0], true);

        await say(item.french, QUESTION_RATE);
        if (!isCurrent()) return;
        setSequencePhase("answer");
        await wait(450);
        if (!isCurrent()) return;

        const next = questions[index + 1];
        if (voice === "openai" && next) prefetchSpeech(next.french);
        await say(item.examples[0], ANSWER_RATE);
        if (!isCurrent()) return;
        if (next) await wait(1500);
      }
      if (!isCurrent()) return;
      setSequencePlaying(false);
      setSequenceComplete(true);
    } catch {
      if (!isCurrent()) return;
      setSequencePlaying(false);
      setError("La lecture audio a été interrompue. Réessaie ou retourne au menu.");
    }
  }

  function startSequence() {
    unlockAudio();
    cancelRecording();
    stopAllSpeech();
    const run = sequenceRunRef.current + 1;
    sequenceRunRef.current = run;
    setMode("sequence");
    setQuestionIndex(0);
    setSequencePhase("question");
    setSequencePlaying(true);
    setSequenceComplete(false);
    setError(null);
    void runSequence(run);
  }

  function startPractice() {
    sequenceRunRef.current += 1;
    stopAllSpeech();
    setMode("practice");
    moveTo(0);
  }

  function returnToMenu() {
    sequenceRunRef.current += 1;
    cancelRecording();
    stopAllSpeech();
    setMode("menu");
    setQuestionIndex(0);
    setAnswer("");
    setFeedback(null);
    setShowTranslation(false);
    setShowModelAnswer(false);
    setSequencePlaying(false);
    setSequenceComplete(false);
    setError(null);
  }

  /** Stops any recording and discards its result. */
  function cancelRecording() {
    recordingTokenRef.current += 1;
    recognitionRef.current?.abort();
    recordingRef.current?.stop();
    recordingRef.current = null;
    setIsRecording(false);
    setIsTranscribing(false);
  }

  async function recordWithOpenAi() {
    const token = recordingTokenRef.current + 1;
    recordingTokenRef.current = token;
    let recording: Recording;
    try {
      recording = await startRecording();
    } catch {
      setError("Le micro n’a pas fonctionné. Vérifie l’autorisation ou écris ta réponse.");
      return;
    }
    if (recordingTokenRef.current !== token) {
      recording.stop();
      return;
    }
    recordingRef.current = recording;
    setIsRecording(true);
    recording.result
      .then((text) => {
        if (recordingTokenRef.current !== token) return;
        if (text) setAnswer(text);
        else setError("Je n’ai rien entendu. Réessaie ou écris ta réponse.");
      })
      .catch(() => {
        if (recordingTokenRef.current === token) setError("La transcription n’a pas fonctionné. Réessaie ou écris ta réponse.");
      })
      .finally(() => {
        if (recordingTokenRef.current !== token) return;
        recordingRef.current = null;
        setIsRecording(false);
        setIsTranscribing(false);
      });
  }

  function recordWithBrowser() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("La reconnaissance vocale n’est pas disponible ici. Écris ta réponse ci-dessous.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setAnswer(transcript.trim());
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError("Le micro n’a pas fonctionné. Vérifie l’autorisation ou écris ta réponse.");
      }
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      setError("Le micro est déjà utilisé. Réessaie dans un instant.");
    }
  }

  function toggleRecording() {
    if (isTranscribing) return;
    if (isRecording) {
      if (recordingRef.current) {
        setIsTranscribing(true);
        recordingRef.current.stop();
      } else {
        recognitionRef.current?.stop();
      }
      return;
    }

    stopAllSpeech();
    setFeedback(null);
    setError(null);
    if (voice === "openai" && canRecord()) void recordWithOpenAi();
    else recordWithBrowser();
  }

  function checkAnswer() {
    cancelRecording();
    setFeedback(evaluate(answer, question));
    setShowModelAnswer(false);
  }

  function moveTo(index: number) {
    cancelRecording();
    stopAllSpeech();
    setQuestionIndex(index);
    setAnswer("");
    setFeedback(null);
    setShowTranslation(false);
    setShowModelAnswer(false);
    setError(null);
  }

  return (
    <main>
      <section className="app-shell" aria-label="Exercice de conversation française">
        <header className={`header ${mode === "menu" ? "menu-header" : ""}`}>
          <div className="brand">
            <span aria-hidden="true">◉</span> Parle avec moi
            {mode !== "menu" && conversation && <small className="brand-topic"> · {conversation.title}</small>}
          </div>
          {mode !== "menu" && (
            <>
              <span className="counter">{questionIndex + 1} / {questions.length}</span>
              <div className="progress" aria-label={`Question ${questionIndex + 1} sur ${questions.length}`}>
                <span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
              </div>
            </>
          )}
        </header>

        {mode === "menu" && !conversation && (
          <section className="card menu-card">
            <span className="eyebrow">CHOISIS TA CONVERSATION</span>
            <h1>De quoi veux-tu parler ?</h1>
            <p className="menu-intro">Choisis une conversation à pratiquer.</p>
            <div className="mode-options">
              {conversations.map((item) => (
                <button key={item.id} className="mode-option" onClick={() => setConversation(item)}>
                  <span className="mode-icon" aria-hidden="true">{item.icon}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle} · {item.questions.length} questions</small>
                  </span>
                  <span className="mode-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {mode === "menu" && conversation && (
          <section className="card menu-card">
            <button className="text-button back-link" onClick={() => { setConversation(null); setError(null); }}>← Changer de conversation</button>
            <span className="eyebrow">{conversation.icon} {conversation.title.toUpperCase()} · CHOISIS TON MODE</span>
            <h1>Comment veux-tu pratiquer ?</h1>
            <p className="menu-intro">Réponds toi-même ou écoute toutes les questions avec un exemple de réponse.</p>
            <div className="mode-options">
              <button className="mode-option" onClick={startPractice}>
                <span className="mode-icon" aria-hidden="true">🎙️</span>
                <span>
                  <strong>Je réponds aux questions</strong>
                  <small>Utilise le micro ou écris chaque réponse.</small>
                </span>
                <span className="mode-arrow" aria-hidden="true">→</span>
              </button>
              <button className="mode-option" onClick={startSequence}>
                <span className="mode-icon" aria-hidden="true">🔊</span>
                <span>
                  <strong>J’écoute la séquence</strong>
                  <small>Écoute chaque question, puis un exemple de réponse.</small>
                </span>
                <span className="mode-arrow" aria-hidden="true">→</span>
              </button>
            </div>
            {error && <p className="error" role="alert">⚠ {error}</p>}
          </section>
        )}

        {mode === "sequence" && (
          <>
            <section className="card sequence-card" aria-live="polite">
              <span className="eyebrow">
                {sequenceComplete ? "SÉQUENCE TERMINÉE" : sequencePhase === "question" ? "ÉCOUTE LA QUESTION" : "ÉCOUTE LA RÉPONSE"}
              </span>
              <h1>{question.french}</h1>
              <div className={`sequence-answer ${sequencePhase === "answer" || sequenceComplete ? "revealed" : ""}`}>
                <span className="eyebrow">EXEMPLE DE RÉPONSE</span>
                <strong>{sequencePhase === "answer" || sequenceComplete ? question.examples[0] : "La réponse suivra la question."}</strong>
              </div>
              {error && <p className="error" role="alert">⚠ {error}</p>}
            </section>

            <section className="card sequence-controls">
              <p>{sequenceComplete ? "Tu as écouté toutes les questions." : sequencePlaying ? "La séquence avance automatiquement." : "La séquence est arrêtée."}</p>
              {sequenceComplete && <button className="button secondary" onClick={startSequence}>↻ Réécouter</button>}
              <button className="button stop-button" onClick={returnToMenu}>
                {sequenceComplete ? "Retour au menu" : "■ Arrêter et retourner au menu"}
              </button>
            </section>
          </>
        )}

        {mode === "practice" && (
          <>
            <section className="card question-card">
              <div className="card-heading">
                <span className="eyebrow">ÉCOUTE LA QUESTION</span>
                <button className="button secondary" onClick={() => speak(question.french)}>
                  <span aria-hidden="true">🔊</span> Écouter
                </button>
              </div>
              <h1>{question.french}</h1>
              <button className="text-button" onClick={() => setShowTranslation((value) => !value)}>
                {showTranslation ? "Masquer la traduction" : "Voir la traduction"}
              </button>
              {showTranslation && <p className="translation" lang="en">{question.english}</p>}
            </section>

            {feedback ? (
              <section className={`card feedback ${feedback.kind}`} aria-live="polite">
                <h2>{feedback.kind === "success" ? "✓" : "✦"} {feedback.title}</h2>
                <p>{feedback.message}</p>
                {showModelAnswer ? (
                  <div className="model-answer">
                    <span className="eyebrow">EXEMPLE DE RÉPONSE</span>
                    <strong>{feedback.modelAnswer}</strong>
                    <button className="button secondary" onClick={() => speak(feedback.modelAnswer, 0.72)}>🔊 Écouter cet exemple</button>
                  </div>
                ) : (
                  <button className="button secondary" onClick={() => setShowModelAnswer(true)}>Voir un exemple de réponse</button>
                )}
                <button className="text-button retry" onClick={() => { setFeedback(null); setAnswer(""); }}>Réessayer cette question</button>
              </section>
            ) : (
              <section className="card response-card">
                <div className="response-top">
                  {speechSupported !== false && (
                    <button className={`record-button ${isRecording && !isTranscribing ? "recording" : ""}`} onClick={toggleRecording} disabled={isTranscribing} aria-label={isRecording ? "Arrêter l’enregistrement" : "Commencer l’enregistrement"}>
                      <span aria-hidden="true">{isRecording ? "■" : "●"}</span>
                    </button>
                  )}
                  <div>
                    <h2>{isTranscribing ? "Je transcris…" : isRecording ? "Je t’écoute…" : "À toi de répondre"}</h2>
                    <p>{speechSupported === false ? "Écris ta réponse en français." : "Utilise le micro ou écris ta réponse."}</p>
                  </div>
                </div>
                <label htmlFor="answer">Ta réponse</label>
                <textarea id="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={conversation?.placeholder} rows={3} autoCapitalize="sentences" />
                <button className="button primary" onClick={checkAnswer} disabled={!answer.trim()}>Vérifier ma réponse</button>
                {error && <p className="error" role="alert">⚠ {error}</p>}
              </section>
            )}

            <nav className="navigation" aria-label="Questions">
              {questionIndex === 0 ? (
                <button className="button secondary" onClick={returnToMenu}>← Menu</button>
              ) : (
                <button className="button secondary" onClick={() => moveTo(questionIndex - 1)}>← Retour</button>
              )}
              {questionIndex === questions.length - 1 ? (
                <button className="button primary" onClick={returnToMenu}>Terminer</button>
              ) : (
                <button className="button primary" onClick={() => moveTo(questionIndex + 1)}>Question suivante →</button>
              )}
            </nav>
          </>
        )}
      </section>
    </main>
  );
}
