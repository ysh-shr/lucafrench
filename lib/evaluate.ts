import type { PracticeQuestion } from "@/data/questions";

export type AnswerFeedback = {
  kind: "success" | "suggestion";
  title: string;
  message: string;
  modelAnswer: string;
};

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function evaluate(answer: string, question: PracticeQuestion): AnswerFeedback {
  const normalizedAnswer = normalize(answer);
  if (!normalizedAnswer) {
    return {
      kind: "suggestion",
      title: "Essaie encore",
      message: "Je n’ai pas entendu de réponse. Utilise le micro ou écris ta réponse en français.",
      modelAnswer: question.examples[0],
    };
  }

  const matchedClue = question.answerClues.some((clue) => normalizedAnswer.includes(normalize(clue)));
  return matchedClue
    ? {
        kind: "success",
        title: "Très bien !",
        message: "Ta réponse convient. Écoute le modèle pour comparer ta prononciation.",
        modelAnswer: closestExample(normalizedAnswer, question.examples),
      }
    : {
        kind: "suggestion",
        title: "Presque !",
        message: "Essaie cette structure, puis réponds de nouveau.",
        modelAnswer: closestExample(normalizedAnswer, question.examples),
      };
}

function closestExample(answer: string, examples: string[]): string {
  return examples.reduce((best, example) =>
    overlap(answer, normalize(example)) > overlap(answer, normalize(best)) ? example : best,
  );
}

function overlap(first: string, second: string): number {
  const firstWords = new Set(first.split(" "));
  return new Set(second.split(" ").filter((word) => firstWords.has(word))).size;
}
