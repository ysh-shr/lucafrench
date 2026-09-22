"use client";

import { useEffect, useRef, useState } from "react";
import { questions } from "@/data/questions";
import { evaluate, type AnswerFeedback } from "@/lib/evaluate";

type AppMode = "menu" | "practice" | "sequence";
type SequencePhase = "question" | "answer";

export function Practice() {
  const [mode, setMode] = useState<AppMode>("menu");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sequencePhase, setSequencePhase] = useState<SequencePhase>("question");
  const [sequencePlaying, setSequencePlaying] = useState(false);
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sequenceRunRef = useRef(0);
  const question = questions[questionIndex];

  useEffect(() => {
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      sequenceRunRef.current += 1;
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function makeUtterance(text: string, rate: number) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = rate;
    const frenchVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang === "fr-FR");
    if (frenchVoice) utterance.voice = frenchVoice;
    return utterance;
  }

  function speak(text: string, rate = 0.78) {
    if (!("speechSynthesis" in window)) {
      setError("La lecture audio n’est pas disponible dans ce navigateur.");
      return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(makeUtterance(text, rate));
  }

  function playSequenceItem(index: number, run: number) {
    if (sequenceRunRef.current !== run) return;

    const item = questions[index];
    setQuestionIndex(index);
    setSequencePhase("question");

    const questionUtterance = makeUtterance(item.french, 0.78);
    questionUtterance.onerror = (event) => {
      if (sequenceRunRef.current !== run || event.error === "interrupted" || event.error === "canceled") return;
      setSequencePlaying(false);
      setError("La lecture audio a été interrompue. Réessaie ou retourne au menu.");
    };
    questionUtterance.onend = () => {
      if (sequenceRunRef.current !== run) return;
      setSequencePhase("answer");

      window.setTimeout(() => {
        if (sequenceRunRef.current !== run) return;
        const answerUtterance = makeUtterance(item.examples[0], 0.72);
        answerUtterance.onerror = (event) => {
          if (sequenceRunRef.current !== run || event.error === "interrupted" || event.error === "canceled") return;
          setSequencePlaying(false);
          setError("La lecture audio a été interrompue. Réessaie ou retourne au menu.");
        };
        answerUtterance.onend = () => {
          if (sequenceRunRef.current !== run) return;
          if (index === questions.length - 1) {
            setSequencePlaying(false);
            setSequenceComplete(true);
            return;
          }
          window.setTimeout(() => playSequenceItem(index + 1, run), 1500);
        };
        window.speechSynthesis.speak(answerUtterance);
      }, 450);
    };
    window.speechSynthesis.speak(questionUtterance);
  }

  function startSequence() {
    recognitionRef.current?.abort();
    if (!("speechSynthesis" in window)) {
      setError("La lecture audio n’est pas disponible dans ce navigateur.");
      return;
    }

    window.speechSynthesis.cancel();
    const run = sequenceRunRef.current + 1;
    sequenceRunRef.current = run;
    setMode("sequence");
    setQuestionIndex(0);
    setSequencePhase("question");
    setSequencePlaying(true);
    setSequenceComplete(false);
    setError(null);
    playSequenceItem(0, run);
  }

  function startPractice() {
    sequenceRunRef.current += 1;
    window.speechSynthesis?.cancel();
    setMode("practice");
    moveTo(0);
  }

  function returnToMenu() {
    sequenceRunRef.current += 1;
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setMode("menu");
    setQuestionIndex(0);
    setAnswer("");
    setFeedback(null);
    setShowTranslation(false);
    setShowModelAnswer(false);
    setIsRecording(false);
    setSequencePlaying(false);
    setSequenceComplete(false);
    setError(null);
  }

  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("La reconnaissance vocale n’est pas disponible ici. Écris ta réponse ci-dessous.");
      return;
    }

    window.speechSynthesis.cancel();
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
    setFeedback(null);
    setError(null);
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      setError("Le micro est déjà utilisé. Réessaie dans un instant.");
    }
  }

  function checkAnswer() {
    recognitionRef.current?.stop();
    setFeedback(evaluate(answer, question));
    setShowModelAnswer(false);
  }

  function moveTo(index: number) {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setQuestionIndex(index);
    setAnswer("");
    setFeedback(null);
    setShowTranslation(false);
    setShowModelAnswer(false);
    setIsRecording(false);
    setError(null);
  }

  return (
    <main>
      <section className="app-shell" aria-label="Exercice de conversation française">
        <header className={`header ${mode === "menu" ? "menu-header" : ""}`}>
          <div className="brand"><span aria-hidden="true">◉</span> Parle avec moi</div>
          {mode !== "menu" && (
            <>
              <span className="counter">{questionIndex + 1} / {questions.length}</span>
              <div className="progress" aria-label={`Question ${questionIndex + 1} sur ${questions.length}`}>
                <span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
              </div>
            </>
          )}
        </header>

        {mode === "menu" && (
          <section className="card menu-card">
            <span className="eyebrow">CHOISIS TON MODE</span>
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
                    <button className={`record-button ${isRecording ? "recording" : ""}`} onClick={toggleRecording} aria-label={isRecording ? "Arrêter l’enregistrement" : "Commencer l’enregistrement"}>
                      <span aria-hidden="true">{isRecording ? "■" : "●"}</span>
                    </button>
                  )}
                  <div>
                    <h2>{isRecording ? "Je t’écoute…" : "À toi de répondre"}</h2>
                    <p>{speechSupported === false ? "Écris ta réponse en français." : "Utilise le micro ou écris ta réponse."}</p>
                  </div>
                </div>
                <label htmlFor="answer">Ta réponse</label>
                <textarea id="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Je m’appelle…" rows={3} autoCapitalize="sentences" />
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
