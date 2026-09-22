"use client";

import { useEffect, useRef, useState } from "react";
import { questions } from "@/data/questions";
import { evaluate, type AnswerFeedback } from "@/lib/evaluate";

export function Practice() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const question = questions[questionIndex];

  useEffect(() => {
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak(text: string, rate = 0.78) {
    if (!("speechSynthesis" in window)) {
      setError("La lecture audio n’est pas disponible dans ce navigateur.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = rate;
    const frenchVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang === "fr-FR");
    if (frenchVoice) utterance.voice = frenchVoice;
    window.speechSynthesis.speak(utterance);
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
        <header className="header">
          <div className="brand"><span aria-hidden="true">◉</span> Parle avec moi</div>
          <span className="counter">{questionIndex + 1} / {questions.length}</span>
          <div className="progress" aria-label={`Question ${questionIndex + 1} sur ${questions.length}`}>
            <span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
          </div>
        </header>

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
          <button className="button secondary" disabled={questionIndex === 0} onClick={() => moveTo(questionIndex - 1)}>← Retour</button>
          {questionIndex === questions.length - 1 ? (
            <button className="button primary" onClick={() => moveTo(0)}>↻ Recommencer</button>
          ) : (
            <button className="button primary" onClick={() => moveTo(questionIndex + 1)}>Question suivante →</button>
          )}
        </nav>
      </section>
    </main>
  );
}
