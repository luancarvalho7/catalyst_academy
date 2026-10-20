"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import flow from "../LessonFlow.module.css";
import styles from "./Practice.module.css";
import { buildPath, formatCents, formatUsd, type Keyframe, type PricePoint } from "./engine";
import { useFrameClock, useTweened } from "./hooks";
import { PriceChart, type ChartEvent, type ChartLine, type ChartMarker } from "./PriceChart";
import {
  ActionBar,
  ArrowIcon,
  CashOutIcon,
  CheckIcon,
  ChoiceCard,
  ChoiceGroup,
  Cta,
  Disclosure,
  Ghost,
  InfoIcon,
  LockIcon,
  Note,
  NumberedList,
  PauseIcon,
  PlusIcon,
  Progress,
  ReplayIcon,
  Scoreboard,
  SecondaryButton,
  SectionLabel,
  ShieldIcon,
  SkipIcon,
  SliderControl,
  Stat,
  StepHeader,
  YourMove,
  revealElement,
  scrollPageTop,
} from "./ui";

type Step = "intro" | "entry" | "game" | "report" | "done";
const STEPS: Step[] = ["intro", "entry", "game", "report", "done"];

type LessonProps = { lessonNumber: number; lessonTotal: number; onNextLesson?: () => void };
type Plan = "hold" | "profit" | "stop";
type Ending = "win" | "loss";
type Action = "hold" | "sellHalf" | "sellAll" | "stayOut" | "reenter";
type MomentId = 1 | 2 | 3 | 4;
type Verdict = "good" | "ok" | "risky";

type GameEvent = { frame: number; period: string; clock: string; text: string; chiefs: number; bills: number; tone: "good" | "bad" | "info" };
type Moment = { id: MomentId; frame: number; title: string; body: string };
type Decision = { moment: MomentId; price: number; action: Action; before: number; after: number; quantity: number; tradePrice: number | null; realized: number };
type TradeMark = { x: number; price: number; side: "buy" | "sell"; quantity: number };
type SideTrade = { offered: boolean; trigger: number; stake: number; won: boolean };
type GameResult = {
  ending: Ending;
  entryContracts: number;
  plan: Plan;
  stopPrice: number | null;
  decisions: Decision[];
  trades: TradeMark[];
  realized: number;
  side: SideTrade;
  maxRisk: number;
  balance: number;
};

const START_BALANCE = 1000;
const MAX_RISK = 20;
const ENTRY_PRICE = 60;
const MAX_CONTRACTS = Math.floor((MAX_RISK * 100) / ENTRY_PRICE);
const RECOVERY_STAKE = 80;
const PREGAME = 24;
const END_FRAME = 200;
const FRAME_MS = 72;

const PLAN_COPY: Record<Plan, { title: string; detail: string }> = {
  hold: { title: "Hold to resolution", detail: "Unless new information breaks my prediction." },
  profit: { title: "Take profits actively", detail: "Sell into strength as the price rises." },
  stop: { title: "Exit at a loss threshold", detail: "Get out if the position loses a set amount." },
};
const STOP_OPTIONS = [25, 50, 75];

const COMMON_KEYS: Keyframe[] = [
  { at: 0, price: 60 },
  { at: 12, price: 60.4 },
  { at: PREGAME, price: 60 },
  { at: 30, price: 61 },
  { at: 36, price: 64, ease: "smooth" },
  { at: 44, price: 62 },
  { at: 50, price: 55, ease: "smooth" },
  { at: 56, price: 52 },
  { at: 60, price: 44, ease: "smooth" },
  { at: 64, price: 40 },
  { at: 70, price: 41 },
  { at: 76, price: 50, ease: "smooth" },
  { at: 84, price: 60, ease: "smooth" },
  { at: 90, price: 57 },
  { at: 100, price: 74, ease: "smooth" },
  { at: 108, price: 85 },
  { at: 116, price: 88 },
  { at: 124, price: 93, ease: "smooth" },
  { at: 130, price: 89 },
  { at: 140, price: 92 },
];

const ENDING_KEYS: Record<Ending, Keyframe[]> = {
  win: [
    { at: 148, price: 86 },
    { at: 156, price: 70, ease: "smooth" },
    { at: 160, price: 45, ease: "smooth" },
    { at: 164, price: 33 },
    { at: 168, price: 31 },
    { at: 176, price: 38 },
    { at: 184, price: 52, ease: "smooth" },
    { at: 192, price: 58 },
    { at: 196, price: 96, ease: "smooth" },
    { at: END_FRAME, price: 100 },
  ],
  loss: [
    { at: 148, price: 87 },
    { at: 156, price: 72, ease: "smooth" },
    { at: 160, price: 42, ease: "smooth" },
    { at: 164, price: 30 },
    { at: 168, price: 27 },
    { at: 176, price: 34 },
    { at: 184, price: 41, ease: "smooth" },
    { at: 190, price: 30 },
    { at: 194, price: 5, ease: "smooth" },
    { at: END_FRAME, price: 0 },
  ],
};

const COMMON_EVENTS: GameEvent[] = [
  { frame: PREGAME, period: "Q1", clock: "15:00", text: "Kickoff. The Chiefs receive.", chiefs: 0, bills: 0, tone: "info" },
  { frame: 35, period: "Q1", clock: "6:12", text: "Chiefs field goal.", chiefs: 3, bills: 0, tone: "good" },
  { frame: 49, period: "Q2", clock: "11:40", text: "Bills touchdown.", chiefs: 3, bills: 7, tone: "bad" },
  { frame: 58, period: "Q2", clock: "4:05", text: "Chiefs QB down after a hard hit.", chiefs: 3, bills: 7, tone: "bad" },
  { frame: 63, period: "Q2", clock: "3:50", text: "The QB walks to the locker room. Status: uncertain.", chiefs: 3, bills: 7, tone: "bad" },
  { frame: 75, period: "Q3", clock: "15:00", text: "Cleared to play: the QB returns to the field.", chiefs: 3, bills: 7, tone: "good" },
  { frame: 83, period: "Q3", clock: "8:21", text: "Chiefs touchdown. Chiefs lead 10–7.", chiefs: 10, bills: 7, tone: "good" },
  { frame: 90, period: "Q3", clock: "1:10", text: "Bills field goal. Tied 10–10.", chiefs: 10, bills: 10, tone: "bad" },
  { frame: 103, period: "Q4", clock: "9:30", text: "Chiefs touchdown. Chiefs lead 17–10.", chiefs: 17, bills: 10, tone: "good" },
  { frame: 123, period: "Q4", clock: "5:02", text: "Chiefs field goal. Chiefs lead 20–10.", chiefs: 20, bills: 10, tone: "good" },
  { frame: 130, period: "Q4", clock: "2:41", text: "Bills field goal. Chiefs lead 20–13.", chiefs: 20, bills: 13, tone: "bad" },
  { frame: 139, period: "Q4", clock: "2:05", text: "Chiefs punt. The Bills get the ball back.", chiefs: 20, bills: 13, tone: "info" },
];

const ENDING_EVENTS: Record<Ending, GameEvent[]> = {
  win: [
    { frame: 148, period: "Q4", clock: "1:40", text: "Bills convert on 3rd & 9.", chiefs: 20, bills: 13, tone: "bad" },
    { frame: 156, period: "Q4", clock: "1:12", text: "Bills at the KC 12.", chiefs: 20, bills: 13, tone: "bad" },
    { frame: 160, period: "Q4", clock: "1:05", text: "Bills TOUCHDOWN. They go for two…", chiefs: 20, bills: 19, tone: "bad" },
    { frame: 165, period: "Q4", clock: "1:05", text: "Two-point try is good. Bills lead 21–20.", chiefs: 20, bills: 21, tone: "bad" },
    { frame: 175, period: "Q4", clock: "0:48", text: "Chiefs complete a 22-yard pass.", chiefs: 20, bills: 21, tone: "good" },
    { frame: 183, period: "Q4", clock: "0:19", text: "Chiefs reach the Bills’ 30.", chiefs: 20, bills: 21, tone: "good" },
    { frame: 195, period: "Q4", clock: "0:00", text: "48-yard field goal… GOOD.", chiefs: 23, bills: 21, tone: "good" },
    { frame: END_FRAME, period: "Final", clock: "", text: "Chiefs 23, Bills 21. YES pays $1.00.", chiefs: 23, bills: 21, tone: "good" },
  ],
  loss: [
    { frame: 148, period: "Q4", clock: "1:31", text: "Bills convert on 3rd & 9.", chiefs: 20, bills: 13, tone: "bad" },
    { frame: 156, period: "Q4", clock: "1:02", text: "Bills at the KC 9.", chiefs: 20, bills: 13, tone: "bad" },
    { frame: 160, period: "Q4", clock: "0:58", text: "Bills TOUCHDOWN. They go for two…", chiefs: 20, bills: 19, tone: "bad" },
    { frame: 165, period: "Q4", clock: "0:58", text: "Two-point try is good. Bills lead 21–20.", chiefs: 20, bills: 21, tone: "bad" },
    { frame: 175, period: "Q4", clock: "0:40", text: "Chiefs complete a 15-yard pass.", chiefs: 20, bills: 21, tone: "good" },
    { frame: 183, period: "Q4", clock: "0:22", text: "Chiefs reach midfield.", chiefs: 20, bills: 21, tone: "info" },
    { frame: 193, period: "Q4", clock: "0:09", text: "Pass INTERCEPTED.", chiefs: 20, bills: 21, tone: "bad" },
    { frame: END_FRAME, period: "Final", clock: "", text: "Bills 21, Chiefs 20. YES pays $0.", chiefs: 20, bills: 21, tone: "bad" },
  ],
};

const MOMENTS: Moment[] = [
  { id: 1, frame: 64, title: "The price drops", body: "The Chiefs’ quarterback appears to be injured. His status is uncertain." },
  { id: 2, frame: 108, title: "The recovery", body: "The quarterback returns. The Chiefs take the lead." },
  { id: 3, frame: 140, title: "Almost certain", body: "Final minutes. The Chiefs lead 20–13, but the Bills still have time for another possession." },
  { id: 4, frame: 168, title: "The emotional test", body: "The Bills score and convert the two-point try. YES falls sharply. The Chiefs get one more possession." },
];

const SCRIPTS: Record<Ending, { path: PricePoint[]; events: GameEvent[] }> = {
  win: { path: buildPath([...COMMON_KEYS, ...ENDING_KEYS.win], { noise: 0.7, seed: 23 }), events: [...COMMON_EVENTS, ...ENDING_EVENTS.win] },
  loss: { path: buildPath([...COMMON_KEYS, ...ENDING_KEYS.loss], { noise: 0.7, seed: 23 }), events: [...COMMON_EVENTS, ...ENDING_EVENTS.loss] },
};

const bidFor = (price: number) => Math.max(1, Math.round(price) - 1);
const askFor = (price: number) => Math.min(99, Math.round(price) + 1);

/* ---------- decision review ---------- */

function reviewDecision(decision: Decision, plan: Plan, stopPrice: number | null): { verdict: Verdict; label: string; text: string } {
  const stopHit = plan === "stop" && stopPrice !== null && decision.price <= stopPrice;
  const { action, moment } = decision;
  const good = (text: string, label = "Reasonable") => ({ verdict: "good" as const, label, text });
  const ok = (text: string, label = "Reconsider") => ({ verdict: "ok" as const, label, text });
  const risky = (text: string, label = "Risky") => ({ verdict: "risky" as const, label, text });

  if (action === "stayOut") return good(moment === 4 ? "You stayed out. Not every move needs a trade." : "You stayed out after exiting. No chasing a move you already left.", "Disciplined");

  if (moment === 1) {
    if (action === "hold") return stopHit ? risky(`YES hit your ${stopPrice}¢ exit threshold and you held. A rule only protects you if you follow it.`, "Off-plan") : good("The injury was uncertain. A lower price alone didn’t prove your prediction wrong, and holding kept you on plan.");
    if (action === "sellHalf") return good("Cutting exposure while the quarterback’s status was unknown balanced risk against upside.");
    if (action === "sellAll") return stopHit ? good("Your threshold was hit and you exited as planned.", "Disciplined") : ok("Exiting fully on uncertain news locks in the loss. Ask whether the information broke your prediction, or only the price.");
  }
  if (moment === 2) {
    if (action === "hold") return plan === "profit" ? ok("Your plan was to take profits, and 85¢ offered +25¢ per contract. Holding is fine if your view changed, but it was off-plan.") : good("Your prediction just got stronger. No reason to abandon it.");
    if (action === "sellHalf") return good("You locked in some gains and kept some upside: a balanced response to a big move.");
    if (action === "sellAll") return plan === "hold" ? ok("A solid profit, though your plan was to hold unless your prediction weakened, and it had just improved.") : good("You banked the recovery. On plan.", "Disciplined");
    return risky("Buying back higher to undo an earlier exit is chasing. Every entry should be its own reasoned trade.", "Chasing");
  }
  if (moment === 3) {
    const bid = bidFor(decision.price);
    if (action === "hold") return good(`Reasonable, if you know the math: you risked about ${bid}¢ to earn ${100 - bid}¢ more per contract.`);
    if (action === "sellHalf" || action === "sellAll") return good(`You locked in ${bid}¢ of a $1 maximum. Giving up ${100 - bid}¢ to remove the risk of losing ${bid}¢ is a legitimate choice.`);
    return risky(`Buying at ${askFor(decision.price)}¢ risks ${askFor(decision.price)}¢ to make ${100 - askFor(decision.price)}¢. Chasing near-certainty is a poor trade-off.`, "Chasing");
  }
  if (action === "hold") return stopHit ? risky(`YES fell through your ${stopPrice}¢ threshold and you held. That was off-plan.`, "Off-plan") : good("Consistent with your plan. A one-point deficit with a minute left is uncertain, not decided.");
  if (action === "sellHalf") return ok("You reduced exposure under pressure. Reasonable, as long as it was a decision and not a flinch.");
  if (action === "sellAll") return stopHit ? good("Threshold hit, exit taken.", "Disciplined") : ok("Selling right after a sharp drop locks in the loss. Reasonable if your view changed, but the game wasn’t over.");
  return ok("Buying after a sharp drop can be a reasoned value trade, or an attempt to win back what you missed. Be honest about which.");
}

function reviewTilt(side: SideTrade): { verdict: Verdict; label: string; text: string } | null {
  if (!side.offered) return null;
  if (side.stake === 0) return { verdict: "good", label: "Disciplined", text: "You didn’t let a loss push you into a new trade." };
  if (side.stake <= MAX_RISK) return { verdict: "good", label: "Within limits", text: `You evaluated the new market at your normal ${formatUsd(MAX_RISK, { decimals: 0 })} size.` };
  return { verdict: "risky", label: "Tilt", text: `${side.stake / MAX_RISK}× your normal risk to win back a loss. That breaches your ${formatUsd(MAX_RISK, { decimals: 0 })} limit, however it turned out.` };
}

const ACTION_LABEL: Record<Action, string> = { hold: "Held", sellHalf: "Sold half", sellAll: "Sold all", stayOut: "Stayed out", reenter: "Bought back in" };

/* ---------- lesson ---------- */

type HeaderProps = { kicker: string; step: number; total: number };

export function ExitGame({ lessonNumber, lessonTotal, onNextLesson }: LessonProps) {
  const [step, setStep] = useState<Step>("intro");
  const [contracts, setContracts] = useState(20);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [stopPct, setStopPct] = useState(50);
  const [ending, setEnding] = useState<Ending>("win");
  const [sideWins, setSideWins] = useState(false);
  const [keepScenario, setKeepScenario] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [completed, setCompleted] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const kicker = `Lesson ${lessonNumber} · Practice`;
  const header: HeaderProps = { kicker, step: STEPS.indexOf(step) + 1, total: STEPS.length };
  const stopPrice = plan === "stop" ? Math.round(ENTRY_PRICE * (1 - stopPct / 100)) : null;

  function go(next: Step) {
    setStep(next);
    scrollPageTop();
  }

  function confirmEntry() {
    if (!plan) return;
    if (!keepScenario) {
      // Neither ending is announced: holding must not always win, and selling must not always save you.
      setEnding(Math.random() < 0.5 ? "win" : "loss");
      setSideWins(Math.random() < 0.5);
    }
    setGameKey((current) => current + 1);
    go("game");
  }

  function finishGame(outcome: GameResult) {
    setResult(outcome);
    if (outcome.decisions.some((decision) => decision.action === "sellHalf" || decision.action === "sellAll")) setCompleted(true);
    go("report");
  }

  function replay(sameGame: boolean) {
    setKeepScenario(sameGame);
    go("entry");
  }

  return (
    <div className={`${flow.flow} ${styles.sim}`}>
      <Progress index={STEPS.indexOf(step)} total={STEPS.length} />

      <div className={flow.screen} key={step === "game" ? `game-${gameKey}` : step}>
        {step === "intro" ? (
          <>
            <StepHeader {...header} title="The Exit Game" lead="Manage one position from entry to the final whistle. Prices will move, news will break, and your emotions will be tested." />
            <div className={styles.factGrid}>
              <div>
                <span>Starting balance</span>
                <strong>{formatUsd(START_BALANCE, { decimals: 0 })}</strong>
              </div>
              <div>
                <span>Max initial risk</span>
                <strong>{formatUsd(MAX_RISK, { decimals: 0 })}</strong>
              </div>
              <div>
                <span>Market</span>
                <strong>Chiefs to win?</strong>
              </div>
              <div>
                <span>YES price now</span>
                <strong>{ENTRY_PRICE}¢</strong>
              </div>
            </div>
            <Disclosure title="How it works">
              <NumberedList
                items={[
                  "Buy a small position before kickoff (up to $20) and pick an exit plan.",
                  "The game pauses at 4 key moments. Each time you choose: hold, sell half, or sell all.",
                  "After the final whistle, review every decision. Good decisions score, lucky ones don’t.",
                ]}
              />
            </Disclosure>
            <Note>
              <p>The goal isn’t to make the most money. It’s to make good decisions with the information you have at the time.</p>
            </Note>
            <ActionBar>
              <Cta onClick={() => go("entry")}>
                Enter the trade <ArrowIcon />
              </Cta>
            </ActionBar>
          </>
        ) : null}

        {step === "entry" ? (
          <EntryScreen
            header={header}
            contracts={contracts}
            plan={plan}
            stopPct={stopPct}
            stopPrice={stopPrice}
            replaying={keepScenario}
            onContracts={setContracts}
            onPlan={setPlan}
            onStopPct={setStopPct}
            onConfirm={confirmEntry}
          />
        ) : null}

        {step === "game" && plan ? (
          <GameScreen header={header} entryContracts={contracts} plan={plan} stopPrice={stopPrice} ending={ending} sideWins={sideWins} onFinish={finishGame} />
        ) : null}

        {step === "report" && result ? <ReportScreen header={header} result={result} completed={completed} onReplay={replay} onFinish={() => go("done")} /> : null}

        {step === "done" ? (
          <>
            <div className={flow.centered}>
              <p className={flow.kicker}>{kicker}</p>
              <p className={flow.verdict}>
                <span className={flow.verdictIcon}>
                  <CheckIcon />
                </span>
                Lesson complete
              </p>
              <p className={styles.mantra}>Good trading isn’t about knowing the future.</p>
            </div>
            <div className={styles.summary}>
              <p>It’s about making disciplined decisions with incomplete information, protecting your capital, and knowing when a position is no longer worth holding.</p>
              <p>Decide your exit plan before you enter. Judge each decision by what you knew at the time, not by how the game ended. And when a loss tempts you to size up and win it back, that’s the moment to step away.</p>
            </div>
            <ActionBar>
              {onNextLesson ? (
                <Cta onClick={onNextLesson}>
                  Next lesson <ArrowIcon />
                </Cta>
              ) : null}
              <Ghost onClick={() => replay(false)}>
                <ReplayIcon /> Play another game
              </Ghost>
            </ActionBar>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- entry ---------- */

function EntryScreen({
  header,
  contracts,
  plan,
  stopPct,
  stopPrice,
  replaying,
  onContracts,
  onPlan,
  onStopPct,
  onConfirm,
}: {
  header: HeaderProps;
  contracts: number;
  plan: Plan | null;
  stopPct: number;
  stopPrice: number | null;
  replaying: boolean;
  onContracts: (value: number) => void;
  onPlan: (plan: Plan) => void;
  onStopPct: (value: number) => void;
  onConfirm: () => void;
}) {
  const investment = (contracts * ENTRY_PRICE) / 100;
  const pregame = useMemo(() => SCRIPTS.win.path.slice(0, PREGAME + 1), []);
  const planRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <StepHeader {...header} title="Enter the trade" lead={replaying ? "Same game as last time. Try a different strategy and compare." : undefined} />
      <YourMove>
        Do this in order: <b>1</b> choose your investment, <b>2</b> choose your exit plan.
      </YourMove>

      <section className={styles.marketPanel} aria-label="Market">
        <Scoreboard chiefs={0} bills={0} period="Kickoff soon" clock="" />
        <div className={styles.marketHead}>
          <div>
            <p className={styles.marketQuestion}>Will the Chiefs win?</p>
            <p className={styles.marketMeta}>Chiefs are favorites. The game is about to begin.</p>
          </div>
          <div className={styles.yesQuote}>
            <span>YES</span>
            <strong>{ENTRY_PRICE}¢</strong>
            <small>{ENTRY_PRICE}% implied</small>
          </div>
        </div>
        <PriceChart points={pregame} xDomain={[0, END_FRAME]} yDomain={[0, 100]} height="clamp(80px, 12vh, 112px)" live futureLabel="The game" label="Chiefs YES holding at 60 cents before kickoff" />
      </section>

      <section className={styles.controlCard} data-active={!plan}>
        <div className={styles.controlHead}>
          <span>
            <b className={styles.stepDot}>1</b> Your investment
          </span>
          <strong>{formatUsd(investment)}</strong>
        </div>
        <SliderControl
          value={contracts}
          min={1}
          max={MAX_CONTRACTS}
          onChange={onContracts}
          onDecrement={() => onContracts(Math.max(1, contracts - 1))}
          onIncrement={() => onContracts(Math.min(MAX_CONTRACTS, contracts + 1))}
          label="contracts to buy at 60 cents"
        />
        <div className={styles.entryFacts}>
          <div>
            <span>Contracts</span>
            <b>{contracts}</b>
          </div>
          <div>
            <span>Maximum loss</span>
            <b>{formatUsd(investment)}</b>
          </div>
          <div>
            <span>
              <LockIcon /> Risk limit
            </span>
            <b>{formatUsd(MAX_RISK, { decimals: 0 })}</b>
          </div>
        </div>
      </section>

      <div ref={planRef} className={styles.revealTarget}>
        <SectionLabel number={2} hint="Choose one">
          Your exit plan
        </SectionLabel>
      </div>
      <ChoiceGroup label="Exit plan">
        {(Object.keys(PLAN_COPY) as Plan[]).map((key) => (
          <ChoiceCard key={key} selected={plan === key} onSelect={() => onPlan(key)} title={PLAN_COPY[key].title} description={PLAN_COPY[key].detail} />
        ))}
      </ChoiceGroup>
      {plan === "stop" && stopPrice !== null ? (
        <div className={styles.stopPicker}>
          <span>Exit if I lose:</span>
          <div className={styles.chips}>
            {STOP_OPTIONS.map((pct) => (
              <button key={pct} type="button" data-active={stopPct === pct} onClick={() => onStopPct(pct)}>
                {pct}%
              </button>
            ))}
          </div>
          <p>
            That’s YES at <b>{stopPrice}¢</b>, a loss of {formatUsd((contracts * (ENTRY_PRICE - stopPrice)) / 100)}
          </p>
        </div>
      ) : null}

      <ActionBar blocked={plan ? undefined : "Step 2: choose your exit plan"} target={planRef}>
        <Cta tone="green" onClick={onConfirm} disabled={!plan}>
          Buy {contracts} YES at {ENTRY_PRICE}¢ · {formatUsd(investment)}
        </Cta>
      </ActionBar>
    </>
  );
}

/* ---------- game ---------- */

type Position = { contracts: number; cost: number; cash: number; realized: number; maxRisk: number };
type TiltState = { status: "idle" } | { status: "offered"; loss: number; resumeTo: number | null } | { status: "done" };

function GameScreen({
  header,
  entryContracts,
  plan,
  stopPrice,
  ending,
  sideWins,
  onFinish,
}: {
  header: HeaderProps;
  entryContracts: number;
  plan: Plan;
  stopPrice: number | null;
  ending: Ending;
  sideWins: boolean;
  onFinish: (result: GameResult) => void;
}) {
  const script = SCRIPTS[ending];
  const entryCost = (entryContracts * ENTRY_PRICE) / 100;
  const [until, setUntil] = useState(PREGAME);
  const frame = useFrameClock(until, FRAME_MS, PREGAME);
  const [position, setPosition] = useState<Position>({ contracts: entryContracts, cost: entryCost, cash: START_BALANCE - entryCost, realized: 0, maxRisk: entryCost });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [trades, setTrades] = useState<TradeMark[]>([{ x: PREGAME, price: ENTRY_PRICE, side: "buy", quantity: entryContracts }]);
  const [tilt, setTilt] = useState<TiltState>({ status: "idle" });
  const [side, setSide] = useState<SideTrade>({ offered: false, trigger: 0, stake: 0, won: false });
  const [settled, setSettled] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setUntil(MOMENTS[0].frame), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  const price = script.path[Math.min(frame, END_FRAME)].price;
  const bid = bidFor(price);
  const ask = askFor(price);
  const moment = MOMENTS.find((entry) => entry.frame === frame && !decisions.some((decision) => decision.moment === entry.id));
  const nextMoment = MOMENTS.find((entry) => !decisions.some((decision) => decision.moment === entry.id));
  const events = script.events.filter((event) => event.frame <= frame);
  const latestEvent = events[events.length - 1];
  const sidePnl = side.stake === 0 ? 0 : side.won ? side.stake : -side.stake;
  const unrealized = position.contracts > 0 ? (position.contracts * bid) / 100 - position.cost : 0;
  const balance = useTweened(position.cash + sidePnl, 700);
  const tiltOpen = tilt.status === "offered";
  const finalCard = settled && !tiltOpen;

  useEffect(() => {
    if (frame < END_FRAME || settled) return;
    const payout = ending === "win" ? position.contracts : 0;
    const realized = position.realized + payout - position.cost;
    setPosition({ ...position, contracts: 0, cost: 0, cash: position.cash + payout, realized });
    setSettled(true);
    if (realized < -0.005 && tilt.status === "idle") setTilt({ status: "offered", loss: -realized, resumeTo: null });
  }, [frame, settled, ending, position, tilt.status]);

  useEffect(() => {
    if (!moment && !tiltOpen && !finalCard) return;
    const timer = window.setTimeout(() => revealElement(cardRef.current), 120);
    return () => window.clearTimeout(timer);
  }, [moment, tiltOpen, finalCard]);

  function act(action: Action) {
    if (!moment) return;
    const decisionPrice = Math.round(price);
    let { contracts, cost, cash, realized, maxRisk } = position;
    let quantity = 0;
    let tradePrice: number | null = null;
    let realizedNow = 0;

    if (action === "sellHalf" || action === "sellAll") {
      quantity = action === "sellAll" ? contracts : Math.max(1, Math.floor(contracts / 2));
      const basis = cost * (quantity / contracts);
      const proceeds = (quantity * bid) / 100;
      realizedNow = proceeds - basis;
      contracts -= quantity;
      cost -= basis;
      cash += proceeds;
      realized += realizedNow;
      tradePrice = bid;
    } else if (action === "reenter") {
      quantity = Math.floor((MAX_RISK * 100) / ask);
      const spend = (quantity * ask) / 100;
      contracts += quantity;
      cost += spend;
      cash -= spend;
      maxRisk = Math.max(maxRisk, cost);
      tradePrice = ask;
    }

    setPosition({ contracts, cost, cash, realized, maxRisk });
    setDecisions((current) => [...current, { moment: moment.id, price: decisionPrice, action, before: position.contracts, after: contracts, quantity, tradePrice, realized: realizedNow }]);
    if (quantity > 0 && tradePrice !== null) {
      const mark: TradeMark = { x: frame, price: tradePrice, side: action === "reenter" ? "buy" : "sell", quantity };
      setTrades((current) => [...current, mark]);
    }

    const resumeTo = MOMENTS.find((entry) => entry.frame > frame)?.frame ?? END_FRAME;
    if (realizedNow < -0.005 && tilt.status === "idle") {
      setTilt({ status: "offered", loss: -realizedNow, resumeTo });
      return;
    }
    setUntil(resumeTo);
  }

  function resolveTilt(stake: number) {
    if (tilt.status !== "offered") return;
    setSide({ offered: true, trigger: tilt.loss, stake, won: stake > 0 && sideWins });
    if (tilt.resumeTo !== null) setUntil(tilt.resumeTo);
    setTilt({ status: "done" });
  }

  function report() {
    onFinish({
      ending,
      entryContracts,
      plan,
      stopPrice,
      decisions,
      trades,
      realized: position.realized,
      side,
      maxRisk: position.maxRisk,
      balance: position.cash + sidePnl,
    });
  }

  const chartLines: ChartLine[] = [];
  if (position.contracts > 0) chartLines.push({ price: (position.cost / position.contracts) * 100, tone: "muted", tag: "Entry", label: `Your avg entry ${formatCents((position.cost / position.contracts) * 100)}` });
  if (stopPrice !== null && !settled) chartLines.push({ price: stopPrice, tone: "red", tag: "Stop", label: `Your exit threshold ${stopPrice}¢` });
  const chartMarkers: ChartMarker[] = trades.map((trade) => ({ x: trade.x, price: trade.price, kind: trade.side, weight: trade.quantity, label: `${trade.side === "buy" ? "Buy" : "Sell"} ${trade.quantity}` }));
  const chartEvents: ChartEvent[] = MOMENTS.filter((entry) => entry.frame <= frame).map((entry) => ({ x: entry.frame, label: `D${entry.id}`, tone: "muted" }));
  const previousPrice = moment ? (moment.id === 1 ? ENTRY_PRICE : Math.round(script.path[MOMENTS[moment.id - 2].frame].price)) : ENTRY_PRICE;
  const change = ((Math.round(price) - previousPrice) / previousPrice) * 100;
  const halfQuantity = Math.max(1, Math.floor(position.contracts / 2));
  const reentryQuantity = Math.floor((MAX_RISK * 100) / ask);

  const title = finalCard ? "The game is over" : tiltOpen ? "A new market appears…" : moment ? `Decision ${moment.id} of 4` : frame <= PREGAME ? "You’re in. Kickoff…" : "The game is live";
  const instruction = tiltOpen
    ? "Someone is offering you a new market. Pick a size and trade it, or skip it. Both are allowed."
    : moment
      ? position.contracts > 0
        ? "The game is paused. Choose what to do with your position: hold, sell half, or sell all."
        : "The game is paused. You have no position: stay out, or buy back in."
      : finalCard
        ? "The game is over. Open your report to see how each decision holds up."
        : "Nothing to tap yet. Watch the game. It pauses automatically when you need to decide.";

  return (
    <>
      <StepHeader {...header} title={title} />
      <YourMove>{instruction}</YourMove>

      <section className={styles.marketPanel} aria-label="Live game">
        <Scoreboard
          chiefs={latestEvent?.chiefs ?? 0}
          bills={latestEvent?.bills ?? 0}
          period={latestEvent?.period ?? "Q1"}
          clock={latestEvent?.clock ?? "15:00"}
          live={!settled}
          final={settled}
        />
        <PriceChart
          points={script.path.slice(0, frame + 1)}
          xDomain={[0, END_FRAME]}
          yDomain={[0, 100]}
          lines={chartLines}
          markers={chartMarkers}
          events={chartEvents}
          height="clamp(150px, 24vh, 220px)"
          live={!settled}
          label={`Chiefs YES at ${Math.round(price)} cents`}
        />
        <ol className={styles.ticker} aria-live="polite">
          {events
            .slice(-2)
            .reverse()
            .map((event) => (
              <li key={event.frame} className={styles.tickerItem} data-tone={event.tone}>
                <time>{event.period === "Final" ? "Final" : `${event.period} ${event.clock}`}</time> {event.text}
              </li>
            ))}
        </ol>
      </section>

      <SectionLabel>Your position</SectionLabel>
      <div className={styles.positionGrid}>
        <Stat label="Contracts" value={position.contracts} />
        <Stat label="YES price" value={`${Math.round(price)}¢`} sub={position.contracts > 0 && !settled ? `You can sell at ${bid}¢` : undefined} />
        <Stat label="Unrealized P&L" value={formatUsd(unrealized, { sign: true })} tone={unrealized > 0.005 ? "green" : unrealized < -0.005 ? "red" : undefined} sub="If you sold now" />
        <Stat label="Realized P&L" value={formatUsd(position.realized, { sign: true })} tone={position.realized > 0.005 ? "green" : position.realized < -0.005 ? "red" : undefined} sub="Locked in" />
        <Stat label="Balance" value={formatUsd(balance)} />
      </div>

      <div ref={cardRef} className={styles.cardSlot}>
        {tiltOpen && tilt.status === "offered" ? (
          <TiltOffer loss={tilt.loss} sideWins={sideWins} onResolve={resolveTilt} />
        ) : moment ? (
          <section className={styles.decisionCard} key={moment.id}>
            <div className={styles.decisionHead}>
              <span>Decision {moment.id} of 4</span>
              <span className={styles.moveChip} data-tone={change < 0 ? "red" : "green"}>
                {previousPrice}¢ → {Math.round(price)}¢ · {change > 0 ? "+" : "−"}
                {Math.abs(change).toFixed(0)}%
              </span>
            </div>
            <h2>{moment.title}</h2>
            <p className={styles.decisionBody}>{moment.body}</p>

            {moment.id === 3 && position.contracts > 0 ? (
              <div className={styles.mathRow}>
                <div>
                  <span>Sell now</span>
                  <b>{formatUsd((position.contracts * bid) / 100)}</b>
                  <small>
                    {bid}¢ × {position.contracts}, locked in
                  </small>
                </div>
                <div>
                  <span>Hold to the end</span>
                  <b>
                    {formatUsd((position.contracts * (100 - bid)) / 100, { sign: true })} / {formatUsd((-position.contracts * bid) / 100)}
                  </b>
                  <small>more if YES wins / lost if it doesn’t</small>
                </div>
              </div>
            ) : null}

            <p className={styles.planChip}>
              Your plan: <b>{PLAN_COPY[plan].title}</b>
              {stopPrice !== null ? ` · exit at ${stopPrice}¢` : ""}
            </p>

            <p className={styles.actionsLabel}>Choose one:</p>
            <div className={styles.actions}>
              {position.contracts > 0 ? (
                <>
                  <button type="button" className={styles.actionButton} data-kind="hold" onClick={() => act("hold")}>
                    <PauseIcon />
                    <strong>Hold</strong>
                    <small>Keep all {position.contracts}</small>
                  </button>
                  <button type="button" className={styles.actionButton} data-kind="sell" onClick={() => act("sellHalf")}>
                    <CashOutIcon />
                    <strong>Sell half</strong>
                    <small>
                      {halfQuantity} for {formatUsd((halfQuantity * bid) / 100)}
                    </small>
                  </button>
                  <button type="button" className={styles.actionButton} data-kind="sell" onClick={() => act("sellAll")}>
                    <CashOutIcon />
                    <strong>Sell all</strong>
                    <small>
                      {position.contracts} for {formatUsd((position.contracts * bid) / 100)}
                    </small>
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={styles.actionButton} data-kind="hold" onClick={() => act("stayOut")}>
                    <SkipIcon />
                    <strong>Stay out</strong>
                    <small>No new risk</small>
                  </button>
                  <button type="button" className={styles.actionButton} data-kind="buy" onClick={() => act("reenter")}>
                    <PlusIcon />
                    <strong>Buy back in</strong>
                    <small>
                      {reentryQuantity} at {ask}¢ = {formatUsd((reentryQuantity * ask) / 100)}
                    </small>
                  </button>
                </>
              )}
            </div>
          </section>
        ) : finalCard ? (
          <Note
            tone={ending === "win" ? "green" : "red"}
            icon={ending === "win" ? <CheckIcon size={18} /> : <InfoIcon />}
            title={ending === "win" ? "Chiefs win. YES settles at $1.00." : "Chiefs lose. YES settles at $0."}
          >
            <p>
              Your realized P&L on this game: <b>{formatUsd(position.realized, { sign: true })}</b>
              {side.stake > 0 ? ` · new market: ${formatUsd(sidePnl, { sign: true })}` : ""}. Now look at the decisions, not just the result.
            </p>
          </Note>
        ) : (
          <div className={styles.statusBox}>
            <span className={styles.liveDot} />
            <p>
              <b>{frame <= PREGAME ? "Kickoff in a moment" : "Game in progress"}</b>
              {nextMoment ? ` · next stop: decision ${nextMoment.id} of 4` : " · heading to the final whistle"}
            </p>
            <div className={styles.momentDots} aria-hidden="true">
              {MOMENTS.map((entry) => (
                <span key={entry.id} data-done={decisions.some((decision) => decision.moment === entry.id)} data-next={nextMoment?.id === entry.id} />
              ))}
            </div>
          </div>
        )}
      </div>

      {finalCard ? (
        <ActionBar>
          <Cta onClick={report}>
            See your trading report <ArrowIcon />
          </Cta>
        </ActionBar>
      ) : null}
    </>
  );
}

/* ---------- tilt trap ---------- */

const SIDE_PATHS: Record<"win" | "loss", PricePoint[]> = {
  win: buildPath(
    [
      { at: 0, price: 50 },
      { at: 10, price: 46 },
      { at: 20, price: 61, ease: "smooth" },
      { at: 30, price: 100, ease: "smooth" },
    ],
    { noise: 1.2, seed: 5 },
  ),
  loss: buildPath(
    [
      { at: 0, price: 50 },
      { at: 10, price: 57 },
      { at: 20, price: 41, ease: "smooth" },
      { at: 30, price: 0, ease: "smooth" },
    ],
    { noise: 1.2, seed: 5 },
  ),
};

function TiltOffer({ loss, sideWins, onResolve }: { loss: number; sideWins: boolean; onResolve: (stake: number) => void }) {
  const [size, setSize] = useState<number>(RECOVERY_STAKE);
  const [placed, setPlaced] = useState<number | null>(null);
  const frame = useFrameClock(placed !== null ? 30 : 0, 85);
  const path = SIDE_PATHS[sideWins ? "win" : "loss"];
  const done = placed !== null && frame >= 30;
  const pnl = placed === null ? 0 : sideWins ? placed : -placed;

  if (placed !== null) {
    return (
      <section className={styles.tiltCard} data-state={done ? (sideWins ? "won" : "lost") : "live"}>
        <p className={styles.tiltKicker}>
          New market · Eagles to beat the Cowboys? · {formatUsd(placed, { decimals: 0 })} on YES at 50¢
        </p>
        <PriceChart points={path.slice(0, frame + 1)} xDomain={[0, 30]} yDomain={[0, 100]} height="96px" tone={done ? (sideWins ? "green" : "red") : "blue"} live={!done} label="Eagles YES price" />
        {done ? (
          <>
            <p className={styles.tiltOutcome}>
              {sideWins ? "Eagles win." : "Eagles lose."} <b>{formatUsd(pnl, { sign: true })}</b>
            </p>
            <p className={styles.tiltNote}>
              {placed > MAX_RISK
                ? `Win or lose, that trade risked ${placed / MAX_RISK}× your normal size and broke your ${formatUsd(MAX_RISK, { decimals: 0 })} limit.`
                : `You kept it to your normal ${formatUsd(MAX_RISK, { decimals: 0 })} size, so the outcome stayed survivable either way.`}
            </p>
            <Cta onClick={() => onResolve(placed)}>
              Back to the Chiefs game <ArrowIcon />
            </Cta>
          </>
        ) : (
          <p className={styles.tiltNote}>The new market is playing out…</p>
        )}
      </section>
    );
  }

  return (
    <section className={styles.tiltCard}>
      <p className={styles.tiltKicker}>Recover your losses?</p>
      <h2>You just lost {formatUsd(loss)} on your previous trade.</h2>
      <p className={styles.tiltQuote}>“You could make it all back with one bigger trade.”</p>
      <div className={styles.tiltMarket}>
        <span>New market</span>
        <strong>Eagles to beat the Cowboys?</strong>
        <b>YES 50¢</b>
      </div>
      <SectionLabel hint="Choose one">Trade size</SectionLabel>
      <ChoiceGroup label="Trade size" columns={2}>
        <ChoiceCard compact tone="amber" selected={size === MAX_RISK} onSelect={() => setSize(MAX_RISK)} title={formatUsd(MAX_RISK, { decimals: 0 })} description="Your normal risk" />
        <ChoiceCard compact tone="amber" selected={size === RECOVERY_STAKE} onSelect={() => setSize(RECOVERY_STAKE)} title={formatUsd(RECOVERY_STAKE, { decimals: 0 })} badge="Suggested" description="Win it all back" />
      </ChoiceGroup>
      <div className={styles.tiltButtons}>
        <Cta tone="green" onClick={() => setPlaced(size)}>
          Place {formatUsd(size, { decimals: 0 })} trade
        </Cta>
        <SecondaryButton onClick={() => onResolve(0)}>
          <SkipIcon /> Skip this market
        </SecondaryButton>
      </div>
    </section>
  );
}

/* ---------- report ---------- */

function ReportScreen({
  header,
  result,
  completed,
  onReplay,
  onFinish,
}: {
  header: HeaderProps;
  result: GameResult;
  completed: boolean;
  onReplay: (sameGame: boolean) => void;
  onFinish: () => void;
}) {
  const script = SCRIPTS[result.ending];
  const entryRisk = (result.entryContracts * ENTRY_PRICE) / 100;
  const sidePnl = result.side.stake === 0 ? 0 : result.side.won ? result.side.stake : -result.side.stake;
  const breached = result.maxRisk > MAX_RISK + 0.005 || result.side.stake > MAX_RISK;
  const activeExit = result.decisions.some((decision) => decision.action === "sellHalf" || decision.action === "sellAll");
  const reviews = result.decisions.map((decision) => ({ decision, review: reviewDecision(decision, result.plan, result.stopPrice) }));
  const tiltReview = reviewTilt(result.side);
  const allReviews = [...reviews.map((entry) => entry.review), ...(tiltReview ? [tiltReview] : [])];
  const count = (verdict: Verdict) => allReviews.filter((review) => review.verdict === verdict).length;

  const markers: ChartMarker[] = result.trades.map((trade) => ({ x: trade.x, price: trade.price, kind: trade.side, weight: trade.quantity, label: `${trade.side === "buy" ? "Buy" : "Sell"} ${trade.quantity}` }));
  const events: ChartEvent[] = MOMENTS.map((moment) => ({ x: moment.frame, label: `D${moment.id}`, tone: "muted" }));

  return (
    <>
      <StepHeader
        {...header}
        title="Your trading report"
        lead={`${result.ending === "win" ? "Chiefs 23, Bills 21. YES paid $1.00." : "Bills 21, Chiefs 20. YES paid $0."} This game could have ended either way, and so can the next one.`}
      />

      <section className={styles.marketPanel} aria-label="Full game">
        <PriceChart
          points={script.path}
          xDomain={[0, END_FRAME]}
          yDomain={[0, 100]}
          markers={markers}
          events={events}
          tone={result.ending === "win" ? "green" : "red"}
          height="clamp(130px, 20vh, 190px)"
          label="Full game price path with your entries and exits"
        />
      </section>

      <div className={styles.reportGrid}>
        <Stat label="Initial risk" value={formatUsd(entryRisk)} sub={`Within the ${formatUsd(MAX_RISK, { decimals: 0 })} limit`} tone="green" />
        <Stat label="Realized P&L" value={formatUsd(result.realized, { sign: true })} tone={result.realized > 0.005 ? "green" : result.realized < -0.005 ? "red" : undefined} sub="From exits and settlement" />
        <Stat label="Unrealized P&L" value={formatUsd(0)} sub="Market resolved" />
        <Stat label="Risk-limit check" value={breached ? "Breach" : "Pass"} tone={breached ? "red" : "green"} sub={breached ? "A trade exceeded $20 of risk" : "Never above $20 of risk"} />
        {result.side.offered ? (
          <Stat
            label="New-market trade"
            value={result.side.stake === 0 ? "Skipped" : formatUsd(sidePnl, { sign: true })}
            tone={result.side.stake > MAX_RISK ? "red" : undefined}
            sub={result.side.stake === 0 ? "No new risk taken" : `${formatUsd(result.side.stake, { decimals: 0 })} at 50¢`}
          />
        ) : null}
        <Stat label="Ending balance" value={formatUsd(result.balance)} sub={`Started at ${formatUsd(START_BALANCE, { decimals: 0 })}`} />
      </div>

      <section className={styles.review}>
        <div className={styles.reviewHead}>
          <p className={styles.sectionLabel}>Decision review</p>
          <span>
            {count("good")} reasonable · {count("ok")} to reconsider · {count("risky")} risky
          </span>
        </div>
        <ol>
          {reviews.map(({ decision, review }) => (
            <li key={decision.moment} className={styles.reviewItem} data-verdict={review.verdict}>
              <div className={styles.reviewMeta}>
                <span>
                  D{decision.moment} · {decision.price}¢
                </span>
                <b>
                  {ACTION_LABEL[decision.action]}
                  {decision.quantity > 0 ? ` ${decision.quantity}` : ""}
                </b>
                <em>{review.label}</em>
              </div>
              <p>{review.text}</p>
            </li>
          ))}
          {tiltReview ? (
            <li className={styles.reviewItem} data-verdict={tiltReview.verdict}>
              <div className={styles.reviewMeta}>
                <span>Tilt trap</span>
                <b>{result.side.stake === 0 ? "Passed" : `Traded ${formatUsd(result.side.stake, { decimals: 0 })}`}</b>
                <em>{tiltReview.label}</em>
              </div>
              <p>{tiltReview.text}</p>
            </li>
          ) : null}
        </ol>
      </section>

      <Note tone="blue" icon={<ShieldIcon />} title="Outcome and decision quality are graded separately.">
        <p>Exiting early and missing a win isn’t automatically wrong. Taking oversized risk and getting lucky isn’t automatically right.</p>
      </Note>

      <SectionLabel>To finish this lesson</SectionLabel>
      <div className={styles.checklist}>
        <span data-done="true">
          <CheckIcon size={14} /> Entered within the risk limit
        </span>
        <span data-done={activeExit || completed}>
          <CheckIcon size={14} /> Sold part or all at least once
        </span>
        <span data-done="true">
          <CheckIcon size={14} /> Played to the final whistle
        </span>
        <span data-done="true">
          <CheckIcon size={14} /> Reviewed your results
        </span>
      </div>

      <SectionLabel>Try a different strategy</SectionLabel>
      <div className={styles.replayRow}>
        <SecondaryButton onClick={() => onReplay(true)}>
          <ReplayIcon /> Replay this exact game
        </SecondaryButton>
        <SecondaryButton onClick={() => onReplay(false)}>
          <ArrowIcon /> Play a new game
        </SecondaryButton>
      </div>

      <ActionBar blocked={completed ? undefined : "Replay and sell part or all at least once to finish"}>
        <Cta onClick={onFinish} disabled={!completed}>
          Finish lesson <ArrowIcon />
        </Cta>
      </ActionBar>
    </>
  );
}
