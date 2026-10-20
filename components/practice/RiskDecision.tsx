"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import flow from "../LessonFlow.module.css";
import styles from "./Practice.module.css";
import { buildPath, formatCount, formatPercent, formatUsd, type PricePoint } from "./engine";
import { useFrameClock, useTweened } from "./hooks";
import { PriceChart } from "./PriceChart";
import {
  ActionBar,
  ArrowIcon,
  CheckIcon,
  Cta,
  Disclosure,
  Ghost,
  InfoIcon,
  LockIcon,
  Note,
  NumberedList,
  Progress,
  ReplayIcon,
  Scoreboard,
  SectionLabel,
  ShieldIcon,
  SliderControl,
  StepHeader,
  YourMove,
  scrollPageTop,
  useRevealWhen,
} from "./ui";

type Step = "intro" | "trade" | "play1" | "limit" | "play2" | "compare" | "challenge" | "done";
const STEPS: Step[] = ["intro", "trade", "play1", "limit", "play2", "compare", "challenge", "done"];

type LessonProps = { lessonNumber: number; lessonTotal: number; onNextLesson?: () => void };

const START_BALANCE = 1000;
const YES_PRICE = 95;
const PROFIT_PER_DOLLAR = (100 - YES_PRICE) / YES_PRICE;
const CHALLENGE_ACCOUNT = 10_000;
const CHALLENGE_LIMIT = 500;
const CHALLENGE_SCALE = CHALLENGE_ACCOUNT / START_BALANCE;

const HISTORY = 36;
const PLAY_FRAMES = 66;
const X_DOMAIN: [number, number] = [0, HISTORY + PLAY_FRAMES];
const TOUCHDOWN_FRAME = 46;

const HISTORY_PATH = buildPath(
  [
    { at: 0, price: 95.3 },
    { at: 12, price: 94.6 },
    { at: 24, price: 95.4 },
    { at: HISTORY, price: 95 },
  ],
  { noise: 0.45, seed: 7 },
);

const PLAY_PATH = buildPath(
  [
    { at: 0, price: 95 },
    { at: 6, price: 94.4 },
    { at: 12, price: 92.5 },
    { at: 15, price: 89.5, ease: "smooth" },
    { at: 24, price: 88 },
    { at: 30, price: 85.5 },
    { at: 33, price: 81, ease: "smooth" },
    { at: 42, price: 78.5 },
    { at: TOUCHDOWN_FRAME, price: 76 },
    { at: 48, price: 30, ease: "smooth" },
    { at: 50, price: 11 },
    { at: 56, price: 6 },
    { at: 60, price: 2 },
    { at: PLAY_FRAMES, price: 0 },
  ],
  { noise: 0.8, seed: 11 },
)
  .slice(1)
  .map((point) => ({ x: point.x + HISTORY, price: point.price }));

type PlayEvent = { frame: number; clock: string; text: string; chiefs: number; bills: number; tone: "info" | "bad" };

const PLAY_EVENTS: PlayEvent[] = [
  { frame: 0, clock: "1:12", text: "Chiefs punt. Bills take over at their own 25.", chiefs: 24, bills: 20, tone: "info" },
  { frame: 14, clock: "0:51", text: "Bills complete a 32-yard pass to midfield.", chiefs: 24, bills: 20, tone: "info" },
  { frame: 30, clock: "0:24", text: "Bills convert on 4th & 6. Ball at the KC 18.", chiefs: 24, bills: 20, tone: "info" },
  { frame: TOUCHDOWN_FRAME, clock: "0:04", text: "TOUCHDOWN BILLS. Extra point is good: Bills lead 27–24.", chiefs: 24, bills: 27, tone: "bad" },
  { frame: 60, clock: "0:00", text: "Final: Bills 27, Chiefs 24. YES settles at $0.", chiefs: 24, bills: 27, tone: "bad" },
];

/* The slider spends its first half on $0–$100 so small, precise stakes are as easy to pick as large ones. */
const SLIDER_STEPS = 1000;

function positionToDollars(position: number): number {
  if (position <= SLIDER_STEPS / 2) return Math.round((position / (SLIDER_STEPS / 2)) * 100);
  return Math.round((100 + ((position - SLIDER_STEPS / 2) / (SLIDER_STEPS / 2)) * 900) / 5) * 5;
}

function dollarsToPosition(dollars: number): number {
  if (dollars <= 100) return (dollars / 100) * (SLIDER_STEPS / 2);
  return SLIDER_STEPS / 2 + ((dollars - 100) / 900) * (SLIDER_STEPS / 2);
}

/** −/+ move $1 at a time below $100 and $10 above, matching the slider's resolution on each half. */
function nudge(dollars: number, direction: 1 | -1, ceiling = START_BALANCE): number {
  const step = (direction > 0 ? dollars >= 100 : dollars > 100) ? 10 : 1;
  return Math.min(ceiling, Math.max(0, dollars + direction * step));
}

const contractsFor = (stake: number) => stake / (YES_PRICE / 100);
const shareOfAccount = (stake: number) => (stake / START_BALANCE) * 100;

/* ---------- shared pieces ---------- */

function useLivePoints(active: boolean): PricePoint[] {
  const [livePrice, setLivePrice] = useState(95);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setLivePrice(94.7 + Math.random() * 0.6), 900);
    return () => window.clearInterval(timer);
  }, [active]);
  return [...HISTORY_PATH.slice(0, -1), { x: HISTORY, price: livePrice }];
}

function AccountBar({ balance, children }: { balance: number; children?: ReactNode }) {
  return (
    <div className={styles.accountBar}>
      <div>
        <span>Simulated balance</span>
        <strong>{formatUsd(balance)}</strong>
      </div>
      {children}
    </div>
  );
}

function MarketPanel({ points }: { points?: PricePoint[] }) {
  return (
    <section className={styles.marketPanel} aria-label="Market">
      <Scoreboard chiefs={24} bills={20} period="Q4" clock="1:12" live />
      <div className={styles.marketHead}>
        <div>
          <p className={styles.marketQuestion}>Chiefs to win against Bills?</p>
          <p className={styles.marketMeta}>Chiefs leading · 4th quarter</p>
        </div>
        <div className={styles.yesQuote}>
          <span>YES</span>
          <strong>{YES_PRICE}¢</strong>
          <small>{YES_PRICE}% implied</small>
        </div>
      </div>
      {points ? (
        <PriceChart
          points={points}
          xDomain={X_DOMAIN}
          minSpan={8}
          height="clamp(84px, 13vh, 124px)"
          live
          futureLabel="1:12 left in the game"
          label="Chiefs YES price holding near 95 cents"
        />
      ) : null}
    </section>
  );
}

function Outcomes({ stake }: { stake: number }) {
  return (
    <div className={styles.outcomes}>
      <div className={styles.outcome} data-tone="green">
        <span>If Chiefs win</span>
        <strong>{formatUsd(stake * PROFIT_PER_DOLLAR, { sign: true })}</strong>
      </div>
      <div className={styles.outcome} data-tone="red">
        <span>If Chiefs lose</span>
        <strong>{formatUsd(-stake)}</strong>
      </div>
    </div>
  );
}

function RiskMeter({ stake, limit }: { stake: number; limit?: number }) {
  const share = shareOfAccount(stake);
  return (
    <div className={styles.riskMeter}>
      <div className={styles.riskMeterTrack}>
        <span className={styles.riskMeterFill} style={{ width: `${share}%` }} />
        {limit !== undefined && limit > 0 ? <span className={styles.riskMeterLimit} style={{ left: `${shareOfAccount(limit)}%` }} /> : null}
      </div>
      <p>
        <b>{formatPercent(share)}</b> of your account at risk
        {stake > 0 ? ` · ≈${formatCount(contractsFor(stake))} contracts` : ""}
      </p>
    </div>
  );
}

/* ---------- flow ---------- */

export function RiskDecision(props: LessonProps) {
  const [run, setRun] = useState(0);
  return <RiskDecisionRun key={run} {...props} onRestart={() => setRun((current) => current + 1)} />;
}

function RiskDecisionRun({ lessonNumber, lessonTotal, onNextLesson, onRestart }: LessonProps & { onRestart: () => void }) {
  const [step, setStep] = useState<Step>("intro");
  const [firstStake, setFirstStake] = useState(0);
  const [lossLimit, setLossLimit] = useState(0);
  const [secondStake, setSecondStake] = useState(0);
  const livePoints = useLivePoints(step === "trade");
  const stakeCardRef = useRef<HTMLElement>(null);
  const kicker = `Lesson ${lessonNumber} · Practice`;
  const stepNumber = STEPS.indexOf(step) + 1;
  const header = { kicker, step: stepNumber, total: STEPS.length };

  function go(next: Step) {
    setStep(next);
    scrollPageTop();
  }

  return (
    <div className={`${flow.flow} ${styles.sim}`}>
      <Progress index={STEPS.indexOf(step)} total={STEPS.length} />

      <div className={flow.screen} key={step}>
        {step === "intro" ? (
          <>
            <StepHeader {...header} title="The $1,000 Decision" lead="You can’t control whether a prediction wins. Let’s find out what you can control." />
            <div className={styles.introBalance}>
              <span>Your simulated balance</span>
              <strong>{formatUsd(START_BALANCE)}</strong>
              <small>Practice money. Nothing real is at risk.</small>
            </div>
            <Disclosure title="How it works">
              <NumberedList items={["Choose how much of your $1,000 to put on a live NFL market.", "Watch the game play out. You can’t change anything once it starts.", "Replay the same game with a risk limit and compare the damage."]} />
            </Disclosure>
            <ActionBar>
              <Cta onClick={() => go("trade")}>
                Enter the market <ArrowIcon />
              </Cta>
            </ActionBar>
          </>
        ) : null}

        {step === "trade" ? (
          <>
            <StepHeader {...header} title="How much will you invest?" />
            <YourMove>
              Use the slider to choose how much of your $1,000 to put on the Chiefs. Then tap <b>Place YES trade</b>.
            </YourMove>
            <AccountBar balance={START_BALANCE} />
            <MarketPanel points={livePoints} />
            <section className={`${styles.controlCard} ${styles.revealTarget}`} ref={stakeCardRef} data-active={firstStake < 1}>
              <div className={styles.controlHead}>
                <span>Your investment</span>
                <strong>{formatUsd(firstStake)}</strong>
              </div>
              <SliderControl
                value={dollarsToPosition(firstStake)}
                min={0}
                max={SLIDER_STEPS}
                onChange={(position) => setFirstStake(positionToDollars(position))}
                onDecrement={() => setFirstStake((current) => nudge(current, -1))}
                onIncrement={() => setFirstStake((current) => nudge(current, 1))}
                label="investment in Chiefs YES"
              />
              <div className={styles.scaleThree}>
                <span>$0</span>
                <span>$100</span>
                <span>$1,000</span>
              </div>
              <RiskMeter stake={firstStake} />
            </section>
            <SectionLabel>What could happen</SectionLabel>
            <Outcomes stake={firstStake} />
            <ActionBar blocked={firstStake < 1 ? "Choose an amount first" : undefined} target={stakeCardRef}>
              <Cta tone="green" disabled={firstStake < 1} onClick={() => go("play1")}>
                Place YES trade{firstStake >= 1 ? ` · ${formatUsd(firstStake)}` : ""}
              </Cta>
            </ActionBar>
          </>
        ) : null}

        {step === "play1" ? <PlayScreen header={header} attempt={1} stake={firstStake} onContinue={() => go("limit")} /> : null}

        {step === "limit" ? (
          <LimitScreen
            header={header}
            firstStake={firstStake}
            lossLimit={lossLimit}
            stake={secondStake}
            onLimit={(value) => {
              setLossLimit(value);
              setSecondStake((current) => Math.min(current, value));
            }}
            onStake={setSecondStake}
            onPlace={() => go("play2")}
          />
        ) : null}

        {step === "play2" ? <PlayScreen header={header} attempt={2} stake={secondStake} lossLimit={lossLimit} onContinue={() => go("compare")} /> : null}

        {step === "compare" ? <CompareScreen header={header} firstStake={firstStake} secondStake={secondStake} lossLimit={lossLimit} onContinue={() => go("challenge")} /> : null}

        {step === "challenge" ? <ChallengeScreen header={header} firstStake={firstStake} secondStake={secondStake} onContinue={() => go("done")} /> : null}

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
              <p className={styles.mantra}>You cannot control whether a prediction wins. You can control how much you lose.</p>
            </div>
            <div className={styles.summary}>
              <p>
                Without a limit you lost <b>{formatUsd(firstStake)}</b> ({formatPercent(shareOfAccount(firstStake))} of your account). With a {formatUsd(lossLimit, { decimals: 0 })} limit you lost{" "}
                <b>{formatUsd(secondStake)}</b> ({formatPercent(shareOfAccount(secondStake))}).
              </p>
              <p>A 95¢ price means “very likely,” not “certain.” Decide your maximum loss before you trade, size the position to fit it, and an unlikely outcome stays survivable.</p>
            </div>
            <ActionBar>
              {onNextLesson ? (
                <Cta onClick={onNextLesson}>
                  Next lesson <ArrowIcon />
                </Cta>
              ) : null}
              <Ghost onClick={onRestart}>
                <ReplayIcon /> Restart this lesson
              </Ghost>
            </ActionBar>
          </>
        ) : null}
      </div>
    </div>
  );
}

type HeaderProps = { kicker: string; step: number; total: number };

/* ---------- play ---------- */

function PlayScreen({ header, attempt, stake, lossLimit, onContinue }: { header: HeaderProps; attempt: 1 | 2; stake: number; lossLimit?: number; onContinue: () => void }) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setStarted(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const frame = useFrameClock(started ? PLAY_FRAMES : 0, attempt === 1 ? 88 : 64);
  const settled = frame >= PLAY_FRAMES;
  const resultRef = useRevealWhen<HTMLElement>(settled);
  const points = [...HISTORY_PATH, ...PLAY_PATH.slice(0, frame)];
  const events = PLAY_EVENTS.filter((event) => started && event.frame <= frame);
  const current = events[events.length - 1];
  const balance = useTweened(settled ? START_BALANCE - stake : START_BALANCE, 1400);
  const lossShare = shareOfAccount(stake);
  const recoveryNeeded = stake < START_BALANCE ? (stake / (START_BALANCE - stake)) * 100 : Infinity;

  return (
    <>
      <StepHeader {...header} title={settled ? "The unexpected happened." : attempt === 2 ? "Same game, smaller risk" : "Your trade is placed"} />
      {!settled ? (
        <YourMove>
          Nothing to tap. Watch the score and the price line. Your trade is locked in until the game ends.
        </YourMove>
      ) : null}
      <AccountBar balance={balance}>
        <div className={styles.accountBarRight}>
          <span>Your position</span>
          <strong className={styles.positionChip}>YES × {formatCount(contractsFor(stake))}</strong>
        </div>
      </AccountBar>

      <section className={styles.marketPanel} aria-label="Live game">
        <Scoreboard chiefs={current?.chiefs ?? 24} bills={current?.bills ?? 20} period="Q4" clock={settled ? "" : current?.clock ?? "1:12"} live={!settled} final={settled} />
        <PriceChart
          points={points}
          xDomain={X_DOMAIN}
          minSpan={8}
          height="clamp(150px, 25vh, 230px)"
          tone={frame >= TOUCHDOWN_FRAME ? "red" : "blue"}
          live={!settled}
          futureLabel={started ? undefined : "1:12 left in the game"}
          events={frame >= TOUCHDOWN_FRAME ? [{ x: HISTORY + TOUCHDOWN_FRAME, label: "BILLS TD", tone: "red" }] : undefined}
          label="Chiefs YES price during the final drive"
        />
        <ol className={styles.ticker} aria-live="polite">
          {events.length === 0 ? (
            <li className={styles.tickerItem} data-tone="good">
              <CheckIcon size={16} /> Bought ≈{formatCount(contractsFor(stake))} YES at 95¢ for {formatUsd(stake)}.
            </li>
          ) : (
            events
              .slice(-2)
              .reverse()
              .map((event) => (
                <li key={event.frame} className={styles.tickerItem} data-tone={event.tone}>
                  <time>{event.clock}</time> {event.text}
                </li>
              ))
          )}
        </ol>
      </section>

      {settled ? (
        <section className={`${styles.resultCard} ${styles.revealTarget}`} ref={resultRef}>
          <SectionLabel>Your result</SectionLabel>
          <div className={styles.outcomes}>
            <div className={`${styles.outcome} ${styles.outcomeMissed}`} data-tone="green">
              <span>You hoped to earn</span>
              <strong>{formatUsd(stake * PROFIT_PER_DOLLAR, { sign: true })}</strong>
            </div>
            <div className={styles.outcome} data-tone="red">
              <span>You actually lost</span>
              <strong>{formatUsd(-stake)}</strong>
            </div>
          </div>

          {attempt === 1 ? (
            stake <= 20 ? (
              <Note tone="green" icon={<ShieldIcon />} title="You already managed your risk.">
                <p>Risking {formatUsd(stake)} kept this loss to {formatPercent(lossShare)} of your account. An unlikely outcome barely dented your balance.</p>
              </Note>
            ) : stake <= 100 ? (
              <Note tone="amber" title={`This loss took ${formatPercent(lossShare)} of your account.`}>
                <p>A 95% favorite still loses about 1 time in 20. Play enough markets and that “1” always shows up.</p>
              </Note>
            ) : stake < START_BALANCE ? (
              <Note tone="red" title={`One unlikely outcome erased ${formatPercent(lossShare, 0)} of your account.`}>
                <p>
                  To get back to {formatUsd(START_BALANCE, { decimals: 0 })} you now need a <b>+{formatPercent(recoveryNeeded, 0)}</b> return. Losses are easy; recovering from them is hard.
                </p>
              </Note>
            ) : (
              <Note tone="red" title="Your account is empty.">
                <p>One “sure thing” ended your ability to trade. There is no next market to win it back on.</p>
              </Note>
            )
          ) : (
            <Note tone="blue" icon={<LockIcon />} title="Same market. Same loss. Different damage.">
              <p>
                Your {formatUsd(lossLimit ?? 0, { decimals: 0 })} limit capped the loss at {formatUsd(stake)}: {formatPercent(lossShare)} of your account. You still have {formatUsd(START_BALANCE - stake)} to trade with.
              </p>
            </Note>
          )}
        </section>
      ) : null}

      {settled ? (
        <ActionBar>
          <Cta onClick={onContinue}>
            {attempt === 1 ? (
              <>
                <ReplayIcon /> Replay with a risk limit
              </>
            ) : (
              <>
                Compare both attempts <ArrowIcon />
              </>
            )}
          </Cta>
        </ActionBar>
      ) : null}
    </>
  );
}

/* ---------- replay with limit ---------- */

function LimitScreen({
  header,
  firstStake,
  lossLimit,
  stake,
  onLimit,
  onStake,
  onPlace,
}: {
  header: HeaderProps;
  firstStake: number;
  lossLimit: number;
  stake: number;
  onLimit: (value: number) => void;
  onStake: (value: number) => void;
  onPlace: () => void;
}) {
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setRestored(true), 250);
    return () => window.clearTimeout(timer);
  }, []);
  const balance = useTweened(restored ? START_BALANCE : START_BALANCE - firstStake, 1100);
  const limitRef = useRef<HTMLElement>(null);
  const stakeRef = useRef<HTMLElement>(null);
  const blocked = lossLimit < 1 ? "Step 1: set your maximum loss" : stake < 1 ? "Step 2: choose your investment" : undefined;

  return (
    <>
      <StepHeader {...header} title="Replay with a risk limit" lead={`Your ${formatUsd(START_BALANCE, { decimals: 0 })} is back. Same market, same moment in the game.`} />
      <YourMove>
        Do this in order: <b>1</b> set the most you’re willing to lose, <b>2</b> choose your investment.
      </YourMove>
      <AccountBar balance={balance} />
      <MarketPanel />

      <section className={`${styles.controlCard} ${styles.revealTarget}`} ref={limitRef} data-active={lossLimit < 1}>
        <div className={styles.controlHead}>
          <span>
            <b className={styles.stepDot}>1</b> Your maximum loss
          </span>
          <strong>{formatUsd(lossLimit, { decimals: 0 })}</strong>
        </div>
        <p className={styles.controlNote}>How much of your {formatUsd(START_BALANCE, { decimals: 0 })} are you willing to lose on this market?</p>
        <SliderControl
          value={dollarsToPosition(lossLimit)}
          min={0}
          max={SLIDER_STEPS}
          onChange={(position) => onLimit(positionToDollars(position))}
          onDecrement={() => onLimit(nudge(lossLimit, -1))}
          onIncrement={() => onLimit(nudge(lossLimit, 1))}
          label="maximum loss on this market"
        />
        <div className={styles.scaleThree}>
          <span>$0</span>
          <span>$100</span>
          <span>$1,000</span>
        </div>
        <p className={styles.controlHint}>
          {lossLimit > 0 ? `${formatPercent(shareOfAccount(lossLimit))} of your account. ` : ""}Many traders cap a single trade at 1–2% of their account.
        </p>
      </section>

      <section className={`${styles.controlCard} ${styles.revealTarget}`} ref={stakeRef} data-disabled={lossLimit < 1} data-active={lossLimit >= 1 && stake < 1}>
        <div className={styles.controlHead}>
          <span>
            <b className={styles.stepDot}>2</b> Your investment
          </span>
          <strong>{formatUsd(stake)}</strong>
        </div>
        <SliderControl
          value={stake}
          min={0}
          max={Math.max(lossLimit, 1)}
          onChange={onStake}
          onDecrement={() => onStake(Math.max(0, stake - 1))}
          onIncrement={() => onStake(Math.min(lossLimit, stake + 1))}
          label="investment within your loss limit"
          disabled={lossLimit < 1}
        />
        <p className={styles.lockNote}>
          <LockIcon /> {lossLimit < 1 ? "Unlocks after step 1." : `Capped at your ${formatUsd(lossLimit, { decimals: 0 })} limit. At 95¢, what you invest is what you can lose.`}
        </p>
        <RiskMeter stake={stake} limit={lossLimit} />
      </section>

      <SectionLabel>What could happen</SectionLabel>
      <Outcomes stake={stake} />
      <ActionBar blocked={blocked} target={lossLimit < 1 ? limitRef : stakeRef}>
        <Cta tone="green" disabled={stake < 1} onClick={onPlace}>
          Place YES trade{stake >= 1 ? ` · ${formatUsd(stake)}` : ""}
        </Cta>
      </ActionBar>
    </>
  );
}

/* ---------- compare ---------- */

function AttemptColumn({ title, tag, stake, highlight }: { title: string; tag: string; stake: number; highlight?: boolean }) {
  const remaining = START_BALANCE - stake;
  const width = useTweened((remaining / START_BALANCE) * 100, 1200);
  return (
    <div className={styles.attempt} data-highlight={highlight}>
      <p className={styles.attemptTitle}>
        {title} <span>{tag}</span>
      </p>
      <dl className={styles.attemptFacts}>
        <div>
          <dt>Invested</dt>
          <dd>{formatUsd(stake)}</dd>
        </div>
        <div>
          <dt>Lost</dt>
          <dd data-tone="red">{formatUsd(-stake)}</dd>
        </div>
        <div>
          <dt>Balance left</dt>
          <dd>{formatUsd(remaining)}</dd>
        </div>
        <div>
          <dt>Losses like this you could absorb</dt>
          <dd>{stake > 0 ? formatCount(Math.floor(START_BALANCE / stake)) : "—"}</dd>
        </div>
      </dl>
      <div className={styles.balanceBar}>
        <span style={{ width: `${width}%` }} />
      </div>
      <p className={styles.balanceBarLabel}>{formatPercent((remaining / START_BALANCE) * 100, 0)} of your account left</p>
    </div>
  );
}

function CompareScreen({ header, firstStake, secondStake, lossLimit, onContinue }: { header: HeaderProps; firstStake: number; secondStake: number; lossLimit: number; onContinue: () => void }) {
  const saved = firstStake - secondStake;
  return (
    <>
      <StepHeader {...header} title="Same trade. Same outcome." lead="The Chiefs lost both times. The only thing that changed was how much you were willing to lose." />
      <div className={styles.attempts}>
        <AttemptColumn title="Attempt 1" tag="No limit" stake={firstStake} />
        <AttemptColumn title="Attempt 2" tag={`${formatUsd(lossLimit, { decimals: 0 })} limit`} stake={secondStake} highlight />
      </div>
      {saved > 0 ? (
        <Note tone="green" icon={<ShieldIcon />} title={`Your risk limit protected ${formatUsd(saved)}.`}>
          <p>Nothing about the game changed. Deciding your maximum loss first is the only reason more of your balance survived.</p>
        </Note>
      ) : firstStake <= 20 ? (
        <Note tone="green" icon={<ShieldIcon />} title="You were disciplined from the start.">
          <p>Your first trade was already small. The limit simply turned a good instinct into a rule you can repeat on every trade.</p>
        </Note>
      ) : (
        <Note tone="amber" title="The limit didn’t shrink this loss.">
          <p>A loss limit only protects you when it’s smaller than what you would otherwise risk. Set it from your account size, not from how confident you feel.</p>
        </Note>
      )}
      <ActionBar>
        <Cta onClick={onContinue}>
          See it in a Catalyst Challenge <ArrowIcon />
        </Cta>
      </ActionBar>
    </>
  );
}

/* ---------- catalyst challenge ---------- */

function ChallengeScreen({ header, firstStake, secondStake, onContinue }: { header: HeaderProps; firstStake: number; secondStake: number; onContinue: () => void }) {
  const [view, setView] = useState<"first" | "second">("first");
  const [compared, setCompared] = useState(false);
  const loss = (view === "first" ? firstStake : secondStake) * CHALLENGE_SCALE;
  const breached = loss > CHALLENGE_LIMIT;
  const room = Math.max(0, CHALLENGE_LIMIT - loss);
  const fill = useTweened(Math.min(1, loss / CHALLENGE_LIMIT) * 100, 900);
  const balance = CHALLENGE_ACCOUNT - loss;
  const moreLosses = loss > 0 ? Math.floor(room / loss) : 0;

  function choose(next: "first" | "second") {
    setView(next);
    if (next === "second") setCompared(true);
  }

  return (
    <>
      <StepHeader {...header} title="Now scale it to a Catalyst Challenge" />
      <YourMove>
        Tap <b>{compared ? "either button" : "With your limit"}</b> to see how each trade would do in a bigger account.
      </YourMove>
      <div className={styles.challengeCard}>
        <span className={styles.challengeBadge}>Hypothetical challenge</span>
        <div className={styles.challengeFacts}>
          <div>
            <span>Simulated account</span>
            <strong>{formatUsd(CHALLENGE_ACCOUNT, { decimals: 0 })}</strong>
          </div>
          <div>
            <span>Trailing loss limit</span>
            <strong>{formatUsd(CHALLENGE_LIMIT, { decimals: 0 })}</strong>
          </div>
        </div>
        <p className={styles.challengeExplain}>Your balance can never fall more than $500 below its highest point. Cross that line and the challenge ends.</p>

        <p className={styles.toggleLabel}>Compare:</p>
        <div className={styles.segmented} role="tablist" aria-label="Position to test">
          <button type="button" role="tab" aria-selected={view === "first"} data-active={view === "first"} onClick={() => choose("first")}>
            Your first trade ×10
          </button>
          <button type="button" role="tab" aria-selected={view === "second"} data-active={view === "second"} className={compared ? undefined : styles.guided} onClick={() => choose("second")}>
            With your limit ×10
          </button>
        </div>

        <p className={styles.challengePosition}>
          Same 95¢ trade, scaled to the bigger account: <b>{formatUsd(loss, { decimals: 0 })}</b> at risk.
        </p>

        <div className={styles.drawdown} data-breached={breached}>
          <div className={styles.drawdownTrack}>
            <span style={{ width: `${fill}%` }} />
          </div>
          <div className={styles.drawdownScale}>
            <span>{formatUsd(CHALLENGE_ACCOUNT, { decimals: 0 })} start</span>
            <span>{formatUsd(CHALLENGE_ACCOUNT - CHALLENGE_LIMIT, { decimals: 0 })} limit</span>
          </div>
        </div>

        <div className={styles.challengeResult} data-breached={breached} key={view}>
          {breached ? (
            <>
              <strong>Challenge breached</strong>
              <p>
                Balance after the loss: {formatUsd(balance, { decimals: 0 })}, which is {formatUsd(loss - CHALLENGE_LIMIT, { decimals: 0 })} past the limit. One trade ended the challenge.
              </p>
            </>
          ) : (
            <>
              <strong>Still in the challenge</strong>
              <p>
                Balance after the loss: {formatUsd(balance, { decimals: 0 })}. You have {formatUsd(room, { decimals: 0 })} of room left
                {moreLosses > 0 ? `, enough for ${formatCount(moreLosses)} more ${moreLosses === 1 ? "loss" : "losses"} like this` : ", but not enough for another loss this size"}.
              </p>
            </>
          )}
        </div>
      </div>
      <Note icon={<InfoIcon />}>
        <p>Trailing means the limit follows your best balance. Grow to $10,300 and the line moves up to $9,800.</p>
      </Note>
      <ActionBar>
        <Cta onClick={onContinue}>
          Finish lesson <ArrowIcon />
        </Cta>
      </ActionBar>
    </>
  );
}
