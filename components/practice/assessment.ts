/*
 * Content ported from the catalyst-academy.html prototype: the Trader-or-Gambler cards (Lesson 1 practice) and
 * the six-question trader assessment (/assessment). `recordAssessment` is the single hand-off point for the answers; today it
 * only persists to this browser, so wiring them into Catalyst Intelligence means changing that one function.
 */

export type TgAnswer = "trader" | "gambler";
export type TgCard = { name: string; color: string; quote: string; answer: TgAnswer; reason: string };

export const TG_CARDS: TgCard[] = [
  { name: "Dave", color: "#C2342B", quote: "Putting half my bankroll on the Chiefs. I’ve had a Mahomes jersey since 2019.", answer: "gambler", reason: "Loyalty isn’t an edge. And half the bankroll? One bad Sunday and Dave’s done." },
  { name: "Priya", color: "#11845B", quote: "Market has the Fed cut at 40%. My read of the data says closer to 55%. Buying a little YES.", answer: "trader", reason: "Her own number, compared to the price, small size. That’s the whole job." },
  { name: "Tony", color: "#B86E00", quote: "Lost my last two. Doubling up tonight to win it all back.", answer: "gambler", reason: "Chasing losses. The market has no idea Tony is down, and doesn’t care." },
  { name: "Marcus", color: "#7A4FD0", quote: "Everyone in the Discord says this one’s free money. I’m in for $400.", answer: "gambler", reason: "If it were free money, the price would already be 99¢." },
  { name: "Lena", color: "#2F6BEA", quote: "I had this at 70%. It’s trading at 72¢. No edge, so I’m skipping it.", answer: "trader", reason: "Passing is a trade. No edge, no bet. Lena gets it." },
  { name: "Jay", color: "#0E8C9A", quote: "Lost $50 on that one. My read was solid, the result just didn’t go my way. Same size next time.", answer: "trader", reason: "Judges the decision, not the result. No tilt. Very Jay." },
];

export function tgVerdict(score: number, total: number): { title: string; line: string } {
  if (score === total) return { title: "Perfect.", line: "You can smell a degen from a mile away." };
  if (score >= total - 2) return { title: "Sharp eye.", line: `${total - score === 1 ? "One slipped past you." : "A couple slipped past you."} The practice lessons will sharpen that.` };
  return { title: "The degens got you.", line: "Good news: that’s exactly what this course is for." };
}

export type QuestionId = "exp" | "markets" | "accounts" | "goal" | "cats" | "method";
export type Question = { id: QuestionId; prompt: string; multi: boolean; options: { value: string; label: string }[] };

export const QUESTIONS: Question[] = [
  {
    id: "exp",
    prompt: "How much trading have you done?",
    multi: false,
    options: [
      { value: "new", label: "New to trading" },
      { value: "other", label: "I trade other markets" },
      { value: "pm", label: "I trade prediction markets" },
    ],
  },
  {
    id: "markets",
    prompt: "Which markets have you traded?",
    multi: true,
    options: [
      { value: "stocks", label: "Stocks" },
      { value: "options", label: "Options" },
      { value: "futures", label: "Futures" },
      { value: "crypto", label: "Crypto" },
      { value: "forex", label: "Forex" },
      { value: "pm", label: "Prediction markets" },
      { value: "sports", label: "Sports betting" },
      { value: "dfs", label: "DFS" },
      { value: "none", label: "None" },
    ],
  },
  {
    id: "accounts",
    prompt: "Do you have a prediction market account?",
    multi: true,
    options: [
      { value: "poly", label: "Polymarket" },
      { value: "kalshi", label: "Kalshi" },
      { value: "other", label: "Other" },
      { value: "none", label: "None" },
    ],
  },
  {
    id: "goal",
    prompt: "What do you want from Catalyst?",
    multi: false,
    options: [
      { value: "learn", label: "Learn how prediction markets work" },
      { value: "edge", label: "Find out if I have an edge" },
      { value: "pass", label: "Pass the Challenge and get paid" },
      { value: "look", label: "Just looking" },
    ],
  },
  {
    id: "cats",
    prompt: "Which categories do you care about?",
    multi: true,
    options: [
      { value: "politics", label: "Politics" },
      { value: "sports", label: "Sports" },
      { value: "crypto", label: "Crypto" },
      { value: "economics", label: "Economics" },
      { value: "geopolitics", label: "Geopolitics" },
      { value: "culture", label: "Culture" },
    ],
  },
  {
    id: "method",
    prompt: "How do you decide what to trade today?",
    multi: false,
    options: [
      { value: "news", label: "News and gut" },
      { value: "follow", label: "I follow other traders" },
      { value: "model", label: "My own model or data" },
      { value: "none", label: "Haven’t traded yet" },
    ],
  },
];

export type Answers = Partial<Record<QuestionId, string[]>>;

export const ARCHETYPES: Record<string, { name: string; line: string }> = {
  news: { name: "The Newshound", line: "You move on headlines. Your edge is speed and judgment. Academy will teach you to check whether the price already knew." },
  follow: { name: "The Scout", line: "You find good traders and learn from them. Next step: forming your own number before you look at theirs." },
  model: { name: "The Quant", line: "You trust numbers over vibes. Academy will push on what models miss: resolution rules and liquidity." },
  none: { name: "Fresh Eyes", line: "No bad habits to unlearn. You’ll build the process first, which is the part most traders skip." },
};

const TRACKS: Record<string, string> = {
  learn: "Learning: work through Lessons 2 to 5 in order. Each one ends with a hands-on practice game.",
  edge: "Edge: Lesson 2 turns prices into probabilities, and Lesson 5 grades your decisions instead of your results.",
  pass: "Challenge: Lesson 3 shows how one oversized trade breaches a Catalyst Challenge, and how to size so it can’t.",
  look: "Browsing: jump into any lesson. Your profile stays saved on this device.",
};

/** Multi-select answers where "none" is exclusive: picking it clears the rest, picking anything else clears it. */
export function toggleMulti(current: string[], value: string): string[] {
  if (value === "none") return current.includes("none") ? [] : ["none"];
  const withoutNone = current.filter((entry) => entry !== "none");
  return withoutNone.includes(value) ? withoutNone.filter((entry) => entry !== value) : [...withoutNone, value];
}

const labelOf = (id: QuestionId, value: string) => QUESTIONS.find((question) => question.id === id)?.options.find((option) => option.value === value)?.label ?? value;
const labelsOf = (id: QuestionId, values: string[] | undefined) => (values ?? []).filter((value) => value !== "none").map((value) => labelOf(id, value));

export type Lead = { name: string; email: string };

export type AssessmentRecord = {
  version: 1;
  completedAt: string;
  answers: Answers;
  archetype: string;
  tgScore: number | null;
  /** Captured on the final step; absent on records saved before lead capture existed. */
  lead?: Lead | null;
};

/** Deliberately loose (something@something.tld): rejects typos, never a real address. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export type Profile = { name: string; line: string; track: string; experience: string; categories: string };

export function profileFor(answers: Answers): Profile {
  const archetype = ARCHETYPES[answers.method?.[0] ?? "none"] ?? ARCHETYPES.none;
  const markets = labelsOf("markets", answers.markets);
  const accounts = labelsOf("accounts", answers.accounts);
  const exp = answers.exp?.[0];
  const experience =
    exp === "new"
      ? "New to trading. You’ll start with the mechanics."
      : exp === "pm"
        ? `Trades prediction markets${accounts.length ? ` on ${accounts.join(" and ")}` : ""}.`
        : `Trades other markets${markets.length ? `: ${markets.join(", ")}` : ""}.`;
  const categories = labelsOf("cats", answers.cats);
  return {
    name: archetype.name,
    line: archetype.line,
    track: TRACKS[answers.goal?.[0] ?? "look"] ?? TRACKS.look,
    experience,
    categories: categories.length ? categories.join(", ") : "No favourites yet",
  };
}

const STORAGE_KEY = "catalyst-academy-assessment-v1";

export function loadAssessment(): AssessmentRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AssessmentRecord) : null;
  } catch {
    return null;
  }
}

/** Single hand-off for completed assessments. Browser-only today; see the note at the top of this file. */
export function recordAssessment(answers: Answers, tgScore: number | null, lead: Lead | null): AssessmentRecord {
  const record: AssessmentRecord = {
    version: 1,
    completedAt: new Date().toISOString(),
    answers,
    archetype: ARCHETYPES[answers.method?.[0] ?? "none"]?.name ?? ARCHETYPES.none.name,
    tgScore,
    lead: lead ? { name: lead.name.trim(), email: lead.email.trim().toLowerCase() } : null,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private mode or blocked storage: the profile still renders for this session.
  }
  return record;
}
