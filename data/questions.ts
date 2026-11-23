export type PracticeQuestion = {
  id: number;
  french: string;
  english: string;
  examples: string[];
  answerClues: string[];
};

export type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  placeholder: string;
  questions: PracticeQuestion[];
};

const colours = ["bleu", "rouge", "vert", "jaune", "rose", "noir", "blanc", "gris", "violet", "orange", "marron", "brun"];

export const conversations: Conversation[] = [
  {
    id: "faire-connaissance",
    title: "Faire connaissance",
    subtitle: "Ton nom, ton âge, ta famille, tes loisirs…",
    icon: "👋",
    placeholder: "Je m’appelle…",
    questions: [
      { id: 1, french: "Bonjour ! Comment t’appelles-tu ?", english: "Hello! What is your name?", examples: ["Je m’appelle Luca.", "Moi, c’est Luca.", "Mon nom est Luca."], answerClues: ["appelle", "moi c est", "mon nom"] },
      { id: 2, french: "Comment ça va aujourd’hui ?", english: "How are you today?", examples: ["Ça va bien, merci. Et toi ?", "Ça va mal.", "Comme ci, comme ça."], answerClues: ["ca va", "comme ci"] },
      { id: 3, french: "Quel âge as-tu ?", english: "How old are you?", examples: ["J’ai douze ans."], answerClues: ["ans"] },
      { id: 4, french: "Quand est ton anniversaire ?", english: "When is your birthday?", examples: ["Mon anniversaire est le 29 septembre.", "Mon anniversaire est en mai."], answerClues: ["anniversaire est", "janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"] },
      { id: 5, french: "As-tu des frères ou des sœurs ?", english: "Do you have any brothers or sisters?", examples: ["Oui, j’ai une sœur.", "Non, je suis enfant unique."], answerClues: ["frere", "soeur", "unique"] },
      { id: 6, french: "Comment s’appelle ton ou ta meilleur·e ami·e ?", english: "What is your best friend’s name?", examples: ["Mon meilleur ami s’appelle Sam.", "Ma meilleure amie s’appelle Léa."], answerClues: ["ami", "amie", "appelle"] },
      { id: 7, french: "As-tu un animal de compagnie ?", english: "Do you have a pet?", examples: ["Oui, j’ai un chien.", "Non, je n’ai pas d’animal."], answerClues: ["animal", "chien", "chat", "poisson"] },
      { id: 8, french: "Quelle est ta matière préférée à l’école ?", english: "What is your favourite subject at school?", examples: ["Ma matière préférée, ce sont les maths.", "Ma matière préférée est le français."], answerClues: ["matiere", "math", "francais", "anglais", "education physique"] },
      { id: 9, french: "Qu’est-ce que tu aimes faire pendant ton temps libre ?", english: "What do you like to do in your free time?", examples: ["J’aime lire.", "J’aime écouter de la musique.", "J’aime faire du sport."], answerClues: ["aime"] },
      { id: 10, french: "Est-ce que tu aimes l’école ? Pourquoi ?", english: "Do you like school? Why?", examples: ["Oui, j’aime l’école parce que c’est amusant.", "Non, je n’aime pas l’école parce que c’est difficile."], answerClues: ["parce que"] },
      { id: 11, french: "Quelle est ta couleur préférée ?", english: "What is your favourite colour?", examples: ["Ma couleur préférée est le bleu.", "Ma couleur préférée est le rouge."], answerClues: ["couleur", "bleu", "rouge", "vert", "jaune", "rose"] },
      { id: 12, french: "Qu’est-ce que tu aimes manger pour le dîner ?", english: "What do you like to eat for dinner?", examples: ["J’aime manger de la pizza.", "J’aime manger des pâtes."], answerClues: ["aime", "manger"] },
      { id: 13, french: "Quelle est ta saison préférée ?", english: "What is your favourite season?", examples: ["Ma saison préférée est l’été.", "Ma saison préférée est l’hiver."], answerClues: ["ete", "hiver", "automne", "printemps", "saison"] },
      { id: 14, french: "Au revoir et bonne journée !", english: "Goodbye and have a good day!", examples: ["Au revoir !", "Merci, à toi aussi !"], answerClues: ["au revoir", "merci", "toi aussi"] },
    ],
  },
  {
    id: "mon-dossier",
    title: "Mon dossier",
    subtitle: "Le professeur vérifie ton dossier.",
    icon: "📁",
    placeholder: "Oui, le voici…",
    questions: [
      { id: 1, french: "Est-ce que tu as ton dossier ?", english: "Do you have your folder?", examples: ["Oui, le voici.", "Non, je l’ai oublié.", "Oui, je le cherche."], answerClues: ["voici", "oublie", "cherche"] },
      { id: 2, french: "Est-ce que ton nom est sur le dossier ?", english: "Is your name on the folder?", examples: ["Oui, mon nom est ici.", "Non, je vais l’écrire maintenant."], answerClues: ["mon nom", "ici", "ecrire", "maintenant"] },
      { id: 3, french: "De quelle couleur est ton dossier ?", english: "What color is your folder?", examples: ["Mon dossier est bleu.", "Je ne sais pas le mot en français."], answerClues: ["dossier est", "sais pas", ...colours] },
      { id: 4, french: "Est-ce que toutes tes feuilles sont dans le dossier ?", english: "Are all your papers in the folder?", examples: ["Oui, tout est dedans.", "Non, il manque une feuille."], answerClues: ["dedans", "manque"] },
      { id: 5, french: "Est-ce que ton dossier est bien organisé ?", english: "Is your folder well organized?", examples: ["Oui, c’est très organisé.", "Un peu, mais je peux faire mieux."], answerClues: ["organise", "un peu", "mieux"] },
      { id: 6, french: "Est-ce que tes feuilles sont en bon état ?", english: "Are your papers in good condition?", examples: ["Oui, elles sont parfaites.", "Non, une feuille est un peu déchirée."], answerClues: ["parfait", "dechire", "bon etat"] },
      { id: 7, french: "Vous êtes à quelle unité ?", english: "What unit are you on? (formal/plural)", examples: ["Je suis à l’unité 1.", "Je suis à l’unité 2."], answerClues: ["unite"] },
      { id: 8, french: "As-tu des questions pour moi aujourd’hui ?", english: "Do you have any questions for me today?", examples: ["Non, tout est clair. Merci !", "Oui, j’ai une petite question."], answerClues: ["clair", "question", "merci"] },
    ],
  },
];
