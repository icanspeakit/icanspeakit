// Every UI string of Bruno sucht den Hochstapler, in one object, so the release tier can move
// them to i18n keys (`hst.<key>` in public/i18n/*.json) without hunting through the code.
// `tx` already asks the dictionary first: a key that exists there wins over the German here.
// The German learning content (words, Redemittel) is not in here: it stays German.
import { t } from "../liveQuiz/text.js";

export const S = {
  // Start
  title: "Bruno sucht den Hochstapler",
  lead: "Alle bekommen dasselbe geheime Wort – nur einer nicht. Beschreibt das Wort auf Deutsch, findet den Hochstapler und lasst euch nicht täuschen.",
  party: "Party: ein Handy für alle",
  partyHint: "3–12 Personen, das Handy geht reihum. Ohne Internet.",
  klasse: "Mit der Klasse spielen",
  klasseHint: "Beamer + Handys, wie das Live-Quiz.",
  how1: "Jede Person schaut heimlich aufs Handy: das Wort – oder „Du bist der Hochstapler“.",
  how2: "Reihum sagt jede Person einen Satz über das Wort, ohne es zu verraten.",
  how3: "Diskutiert und stimmt ab. Erwischt? Dann darf der Hochstapler noch das Wort raten.",

  // Setup
  setupTitle: "Wer spielt mit?",
  addPlaceholder: "Name",
  add: "Dazu",
  dice: "Tiername würfeln",
  remove: "{name} entfernen",
  level: "Niveau",
  theme: "Thema",
  themeRandom: "Zufall",
  rounds: "Hinweisrunden",
  discussTime: "Diskussion",
  seconds: "{n} s",
  voteMode: "Abstimmen",
  voteSecret: "geheim, nacheinander",
  voteGroup: "gemeinsam",
  start: "Spiel starten",
  needPlayers: "Noch {n} Person(en) fehlen – mindestens 3.",
  full: "Mehr als 12 geht nicht.",
  nameTaken: "Den Namen gibt es schon.",
  loadError: "Die Wörter konnten nicht geladen werden. Bitte lade die Seite neu.",

  // Pass and reveal
  passTo: "Gib das Handy an {name}",
  passOnly: "Nur {name} schaut!",
  passBtn: "Ich bin {name} – zeigen",
  yourWord: "Dein Wort",
  youAre: "Du bist der Hochstapler!",
  themeIs: "Thema: {theme}",
  impostorTip: "Hör gut zu, sag etwas Passendes – und lass dich nicht erwischen.",
  wordTip: "Beschreib das Wort, aber sag es nicht. Der Hochstapler hört mit!",
  hideBtn: "Verstecken und weitergeben",
  hideLast: "Verstecken – los geht's",

  // Clues
  cluesTitle: "Hinweise",
  cluesRound: "Runde {r} von {n}",
  turnOf: "{name} ist dran",
  cluesSay: "Sag einen Satz über das Wort – ohne das Wort.",
  helpers: "Hilfe für den Satz",
  nextPlayer: "Fertig – weiter",
  toDiscuss: "Fertig – zur Diskussion",

  // Discussion
  discussTitle: "Diskussion",
  discussSay: "Wer war verdächtig? Sagt warum.",
  more30: "+30 s",
  toVote: "Jetzt abstimmen",
  timeUp: "Zeit ist um!",

  // Vote
  voteTitle: "Abstimmung",
  voteWho: "{name}, wer ist der Hochstapler?",
  voteGroupWho: "Wer ist der Hochstapler? Einigt euch auf eine Person.",
  voteFor: "Für {name} stimmen",
  votePick: "Tippe zuerst auf eine Person.",
  voteSent: "Stimme abgegeben. Weitergeben!",

  // Reveal
  revealTitle: "Auflösung",
  mostVotes: "Die meisten Stimmen: {name}",
  tie: "Gleichstand – niemand wird beschuldigt!",
  noVotes: "Keine Stimmen.",
  wasImpostor: "{name} war der Hochstapler!",
  wasInnocent: "{name} war unschuldig!",
  realImpostor: "Der Hochstapler war {name}.",
  drum: "Bruno zieht den Vorhang auf …",

  // Rescue
  rescueTitle: "Rettungsversuch",
  rescueWho: "{name}, letzte Chance: Welches war das Wort?",
  rescueRight: "Richtig geraten! {name} stiehlt den Sieg.",
  rescueWrong: "Falsch! Das Wort war {word}.",

  // Score
  groupWins: "Die Gruppe gewinnt!",
  impostorWins: "Der Hochstapler gewinnt!",
  wordWas: "Das Wort war",
  scores: "Punkte",
  nextRound: "Nächste Runde",
  endGame: "Spiel beenden",
  roundN: "Runde {n}",
  gameOver: "Spielende",
  playAgain: "Neues Spiel",
  points: "{n} P.",
  votesN: "{n} Stimme(n)",
};

/** A string by key, from the dictionary (hst.<key>) or the German above, with {vars}. */
export const tx = (key, vars) => t(`hst.${key}`, S[key] ?? key, vars);
