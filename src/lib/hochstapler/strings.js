// Every UI string of Bruno finds the impostor, in one object, so the release tier can move
// them to i18n keys (`hst.<key>` in public/i18n/*.json) without hunting through the code.
// `tx` already asks the dictionary first: a key that exists there wins over the English here.
// The learning content (words, phrases) is not in here: it lives in src/data/hochstapler/.
import { t } from "../liveQuiz/text.js";

export const S = {
  // Start
  title: "Bruno and the Impostor",
  lead: "Everyone gets the same secret word – except one player. Describe the word in English, find the impostor and don't let them fool you.",
  party: "Party: one phone for everyone",
  partyHint: "3–12 players, pass the phone round. No internet needed.",
  klasse: "Play with your class",
  klasseHint: "Projector + phones, like the live quiz.",
  how1: "Everyone looks at the phone in secret: the word – or “You are the impostor”.",
  how2: "Take turns: each person says one sentence about the word without giving it away.",
  how3: "Discuss and vote. Caught? Then the impostor can still guess the word.",

  // Setup
  setupTitle: "Who's playing?",
  addPlaceholder: "Name",
  add: "Add",
  dice: "Roll an animal name",
  remove: "Remove {name}",
  level: "Level",
  theme: "Theme",
  themeRandom: "Random",
  rounds: "Clue rounds",
  discussTime: "Discussion",
  seconds: "{n} s",
  voteMode: "Voting",
  voteSecret: "secret, one by one",
  voteGroup: "together",
  start: "Start the game",
  needPlayers: "{n} more player(s) needed – at least 3.",
  full: "12 is the maximum.",
  nameTaken: "That name is already taken.",
  loadError: "The words could not be loaded. Please reload the page.",

  // Pass and reveal
  passTo: "Pass the phone to {name}",
  passOnly: "Only {name} looks!",
  passBtn: "I'm {name} – show me",
  yourWord: "Your word",
  youAre: "You are the impostor!",
  themeIs: "Theme: {theme}",
  impostorTip: "Listen carefully, say something that fits – and don't get caught.",
  wordTip: "Describe the word, but don't say it. The impostor is listening!",
  hideBtn: "Hide and pass on",
  hideLast: "Hide – let's go",

  // Clues
  cluesTitle: "Clues",
  cluesRound: "Round {r} of {n}",
  turnOf: "{name}'s turn",
  cluesSay: "Say one sentence about the word – without the word.",
  helpers: "Help for your sentence",
  nextPlayer: "Done – next",
  toDiscuss: "Done – to the discussion",

  // Discussion
  discussTitle: "Discussion",
  discussSay: "Who was suspicious? Say why.",
  more30: "+30 s",
  toVote: "Vote now",
  timeUp: "Time's up!",

  // Vote
  voteTitle: "Vote",
  voteWho: "{name}, who is the impostor?",
  voteGroupWho: "Who is the impostor? Agree on one person.",
  voteFor: "Vote for {name}",
  votePick: "Tap a person first.",
  voteSent: "Vote sent. Pass it on!",

  // Reveal
  revealTitle: "The answer",
  mostVotes: "Most votes: {name}",
  tie: "It's a tie – nobody is accused!",
  noVotes: "No votes.",
  wasImpostor: "{name} was the impostor!",
  wasInnocent: "{name} was innocent!",
  realImpostor: "The impostor was {name}.",
  drum: "Bruno opens the curtain …",

  // Rescue
  rescueTitle: "Last chance",
  rescueWho: "{name}, last chance: what was the word?",
  rescueRight: "Right! {name} steals the win.",
  rescueWrong: "Wrong! The word was {word}.",

  // Score
  groupWins: "The group wins!",
  impostorWins: "The impostor wins!",
  wordWas: "The word was",
  scores: "Points",
  nextRound: "Next round",
  endGame: "End the game",
  roundN: "Round {n}",
  gameOver: "Game over",
  playAgain: "New game",
  points: "{n} pts",
  votesN: "{n} vote(s)",

  // Class mode (projector)
  favSaved: "Saved as favourite",
  openError: "The room could not be opened. Please reload the page.",
  rename: "Rename {name}",
  kick: "Remove {name}",
  lobbyEmpty: "Nobody has joined yet.",
  skipTurn: "Skip this turn",
  voteOnPhones: "Vote on your phones.",
  votedN: "{n} of {of} have voted",
  revealNow: "Show the answer",
  toResult: "To the result",
  rescueOnPhone: "The impostor picks the word on their phone.",
  rescueHostHint: "Or pick it here for them.",
  clueNamed: "held back: it names the word",
  clueHidden: "hidden",
  clueWaiting: "coming up …",
  quitSure: "Really end? Tap again",
  quit: "End the game",
};

/** A string by key, from the dictionary (hst.<key>) or the English above, with {vars}. */
export const tx = (key, vars) => t(`hst.${key}`, S[key] ?? key, vars);
