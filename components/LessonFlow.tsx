"use client";

import Image from "next/image";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import styles from "./LessonFlow.module.css";

type StepId = "market" | "correct" | "estimate" | "compare" | "btc" | "quick" | "inflation" | "better" | "final" | "done";

const STEPS: StepId[] = ["market", "correct", "estimate", "compare", "btc", "quick", "inflation", "better", "final", "done"];

const MARKET_PRICE = 36;

type OptionState = "idle" | "correct" | "wrong";
type Tone = "blue" | "green" | "amber";

type FlowProps = {
  lessonNumber: number;
  lessonTotal: number;
  onNextLesson?: () => void;
};

/* ---------- icons ---------- */

function Svg({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const BarsIcon = () => (
  <Svg>
    <path d="M6 20V11M12 20V4M18 20v-6" strokeWidth="3.2" />
  </Svg>
);

const MoneyIcon = () => (
  <Svg>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6.5 9.5v.01M17.5 14.5v.01" />
  </Svg>
);

const BallIcon = () => (
  <Svg>
    <path d="M4.5 19.5c-1-5 2-12.5 8-14.5 3.2-1.1 5.6-.8 7-.5.5 1.4.7 3.8-.5 7-2 6-9.5 9-14.5 8Z" />
    <path d="m9.5 14.5 5-5M11 9.5l1.5 1.5M13 12.5l1.5 1.5" />
  </Svg>
);

const HelpIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8M12 17v.01" />
  </Svg>
);

const HeartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s-8-4.9-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 6.1-8 11-8 11Z" fill="#ff4d5e" />
  </svg>
);

const FootballIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20c-1-5.5 2-13 8.5-15.5 3.5-1.3 6-1 7.5-.5.5 1.5.8 4-.5 7.500C17 18 9.500 21 4 20Z" fill="#f08a1c" />
    <path d="m9 15 6-6M10.500 10.500l2 2M12.500 8.500l2 2" stroke="#fff3df" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ClockIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.500V12l3 2" />
  </Svg>
);

const WarnIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3c1 3.500 5.500 5.500 5.500 10.500a5.500 5.500 0 0 1-11 0c0-2 .8-3.400 2-4.500.2 1.300.8 2 1.600 2.300C9.700 8.400 10.500 5.500 12 3Z" fill="#ff7a45" />
  </svg>
);

const CheckIcon = () => (
  <Svg>
    <path d="m5 12.500 4.500 4.500L19 7.500" strokeWidth="2.600" />
  </Svg>
);

const CrossIcon = () => (
  <Svg>
    <path d="m7 7 10 10M17 7 7 17" strokeWidth="2.600" />
  </Svg>
);

const InfoIcon = () => (
  <Svg size={22}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.800v.01" strokeWidth="2.200" />
  </Svg>
);

const CalendarIcon = () => (
  <Svg size={24}>
    <rect x="4" y="5.500" width="16" height="14.500" rx="2.500" />
    <path d="M4 10h16M8.500 3.500v4M15.500 3.500v4" />
  </Svg>
);

const BankIcon = () => (
  <Svg size={24}>
    <path d="M3.500 9.500 12 4l8.500 5.500M5 10v8m4.700-8v8m4.600-8v8M19 10v8M3.500 20.500h17" />
  </Svg>
);

const TrendIcon = () => (
  <Svg size={26}>
    <path d="m3.500 17 6-6 3.500 3.500L20.500 7M15 7h5.500v5.500" strokeWidth="2.400" />
  </Svg>
);

const ArrowIcon = () => (
  <Svg size={18}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </Svg>
);

/* ---------- building blocks ---------- */

function Option({
  icon,
  label,
  state,
  tone = "blue",
  center = false,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  state: OptionState;
  tone?: Tone;
  center?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.option} ${center ? styles.optionCenter : ""}`}
      data-state={state}
      data-tone={tone}
      onClick={onClick}
    >
      {icon ? <span className={styles.optionIcon}>{icon}</span> : null}
      <span className={styles.optionLabel}>{label}</span>
    </button>
  );
}

function useQuiz(answer: string) {
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const solved = picked === answer;

  function choose(id: string) {
    if (solved) return;
    if (id === answer) setPicked(id);
    else setWrong((current) => (current.includes(id) ? current : [...current, id]));
  }

  function stateOf(id: string): OptionState {
    if (id === picked) return "correct";
    return !solved && wrong.includes(id) ? "wrong" : "idle";
  }

  return { solved, choose, stateOf, missed: wrong.length > 0 };
}

function Matchup() {
  return (
    <div className={styles.matchup}>
      <Image src="/helmet-chiefs.png" alt="Kansas City Chiefs helmet" width={500} height={424} className={styles.helmet} priority />
      <span className={styles.vs}>VS</span>
      <Image src="/helmet-bills.png" alt="Buffalo Bills helmet" width={456} height={424} className={styles.helmet} priority />
    </div>
  );
}

function Cta({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={styles.cta} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* ---------- flow ---------- */

export function LessonFlow(props: FlowProps) {
  const [run, setRun] = useState(0);
  return <LessonFlowRun key={run} {...props} onRestart={() => setRun((current) => current + 1)} />;
}

function LessonFlowRun({ lessonNumber, lessonTotal, onNextLesson, onRestart }: FlowProps & { onRestart: () => void }) {
  const [index, setIndex] = useState(0);
  const [estimate, setEstimate] = useState(55);

  const marketQuiz = useQuiz("probability");
  const btcQuiz = useQuiz("probability");
  const quickQuiz = useQuiz("one");
  const inflationQuiz = useQuiz("unclear");
  const finalQuiz = useQuiz("edge");

  const step = STEPS[index];
  const next = () => setIndex((current) => Math.min(current + 1, STEPS.length - 1));
  const lessonKicker = `Lesson ${lessonNumber} of ${lessonTotal}`;

  useEffect(() => {
    if (step !== "market" || !marketQuiz.solved) return;
    const timer = window.setTimeout(next, 750);
    return () => window.clearTimeout(timer);
  }, [step, marketQuiz.solved]);

  const diff = estimate - MARKET_PRICE;
  const diffTone = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const diffLabel = diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : "0";
  const edgeLabel =
    diff > 0
      ? `I think their chance is higher than the market’s ${MARKET_PRICE}%`
      : diff < 0
        ? `I think their chance is lower than the market’s ${MARKET_PRICE}%`
        : `I think the market’s ${MARKET_PRICE}% is the wrong price`;
  const finalSide = diff < 0 ? { side: "CHIEFS NO", price: 100 - MARKET_PRICE } : { side: "CHIEFS YES", price: MARKET_PRICE };
  const compareCopy =
    diff > 0
      ? "You think the Chiefs are more likely to win than the market does."
      : diff < 0
        ? "You think the Chiefs are less likely to win than the market does."
        : "Your estimate matches the market’s estimate.";

  return (
    <div className={styles.flow}>
      <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={index + 1}>
        <span style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className={styles.screen} key={step}>
        {step === "market" ? (
          <>
            <p className={styles.kicker}>{lessonKicker}</p>
            <h1 className={styles.title}>What Does {MARKET_PRICE}¢ Mean?</h1>
            <p className={styles.subtitle}>Markets turn opinions into prices.</p>

            <section className={styles.panel}>
              <span className={styles.badge} data-tone="blue">Practice Market</span>
              <Matchup />
              <p className={styles.question}>Will the Chiefs win this game?</p>
              <div className={styles.priceBox} data-tone="red">
                <span>CHIEFS YES</span>
                <strong>{MARKET_PRICE}¢</strong>
              </div>
            </section>

            <h2 className={styles.prompt}>What does {MARKET_PRICE}¢ mean?</h2>
            <div className={`${styles.options} ${styles.optionsGrid}`}>
              <Option icon={<BarsIcon />} label={`${MARKET_PRICE}% market probability`} state={marketQuiz.stateOf("probability")} onClick={() => marketQuiz.choose("probability")} />
              <Option icon={<MoneyIcon />} label="$58 potential profit" state={marketQuiz.stateOf("profit")} onClick={() => marketQuiz.choose("profit")} />
              <Option icon={<BallIcon />} label={`Chiefs win by ${MARKET_PRICE} points`} state={marketQuiz.stateOf("points")} onClick={() => marketQuiz.choose("points")} />
              <Option icon={<HelpIcon />} label="I don’t know" state={marketQuiz.stateOf("unknown")} onClick={() => marketQuiz.choose("unknown")} />
            </div>
            {marketQuiz.missed && !marketQuiz.solved ? <p className={styles.hint}>Not quite. Think about what a price tells you about how likely something is.</p> : null}
          </>
        ) : null}

        {step === "correct" ? (
          <div className={styles.centered}>
            <p className={styles.kicker}>{lessonKicker}</p>
            <p className={styles.verdict}>
              <span className={styles.verdictIcon}><CheckIcon /></span>
              Correct!
            </p>
            <p className={styles.bigPrice}>{MARKET_PRICE}¢</p>
            <span className={styles.tick} />
            <p className={styles.impliesLabel}>MARKET IMPLIES</p>
            <p className={styles.bigPercent}>{MARKET_PRICE}%</p>
            <div className={styles.note}>
              <p>It doesn’t mean the Chiefs truly have a {MARKET_PRICE}% chance.</p>
              <p>It means the market is currently pricing them that way based on everyone’s opinions.</p>
            </div>
            <Cta onClick={next}>Continue</Cta>
          </div>
        ) : null}

        {step === "estimate" ? (
          <>
            <p className={styles.kicker}>{lessonKicker}</p>
            <h1 className={styles.title}>What do YOU think?</h1>
            <p className={styles.subtitle}>Will the Chiefs win this game?</p>
            <Matchup />
            <section className={`${styles.panel} ${styles.sliderPanel}`}>
              <p className={styles.sliderLabel}>Your estimate:</p>
              <p className={styles.sliderValue}>{estimate}%</p>
              <input
                className={styles.slider}
                type="range"
                min={0}
                max={100}
                value={estimate}
                onChange={(event) => setEstimate(Number(event.target.value))}
                style={{ "--fill": `${estimate}%` } as CSSProperties}
                aria-label="Your estimate that the Chiefs win"
              />
              <div className={styles.sliderScale}>
                <span>0%</span>
                <span>100%</span>
              </div>
            </section>
            <Cta onClick={next}>Lock it in</Cta>
          </>
        ) : null}

        {step === "compare" ? (
          <>
            <p className={styles.kicker}>{lessonKicker}</p>
            <h1 className={styles.title}>Here’s the comparison:</h1>
            <div className={styles.compareRow}>
              <div className={styles.statBox} data-tone="green">
                <span>YOUR ESTIMATE</span>
                <strong>{estimate}%</strong>
              </div>
              <div className={styles.statBox} data-tone="blue">
                <span>MARKET</span>
                <strong>{MARKET_PRICE}%</strong>
              </div>
            </div>
            <div className={styles.diffBox} data-tone={diffTone}>
              <strong>{diffLabel}</strong>
              <span>percentage points</span>
            </div>
            <p className={styles.compareCopy}>{compareCopy}</p>
            <div className={styles.infoBox}>
              <InfoIcon />
              <p>Trading starts when your estimate differs from the market’s estimate.</p>
            </div>
            <Cta onClick={next}>Next Market</Cta>
          </>
        ) : null}

        {step === "btc" ? (
          <>
            <p className={styles.kicker}>Market 3 of 3</p>
            <h1 className={styles.title}>What’s the market implying?</h1>
            <div className={styles.asset}>
              <span className={styles.coin}>₿</span>
              <p>Will Bitcoin finish 2026 above $150,000?</p>
            </div>
            <div className={styles.yesBox}>
              <div>
                <span>YES</span>
                <strong>58¢</strong>
              </div>
              <TrendIcon />
            </div>
            <h2 className={styles.prompt}>What probability does 58¢ imply?</h2>
            <div className={`${styles.options} ${styles.optionsGrid}`}>
              <Option icon={<BarsIcon />} label="58% market probability" state={btcQuiz.stateOf("probability")} onClick={() => btcQuiz.choose("probability")} />
              <Option icon={<MoneyIcon />} label="$58 potential profit" state={btcQuiz.stateOf("profit")} onClick={() => btcQuiz.choose("profit")} />
              <Option icon={<BallIcon />} label="Lakers win by 67 points" state={btcQuiz.stateOf("lakers")} onClick={() => btcQuiz.choose("lakers")} />
              <Option icon={<HelpIcon />} label="I don’t know" state={btcQuiz.stateOf("unknown")} onClick={() => btcQuiz.choose("unknown")} />
            </div>
            {btcQuiz.missed && !btcQuiz.solved ? <p className={styles.hint}>Not quite. It’s the same idea as the Chiefs market.</p> : null}
            <Cta onClick={next} disabled={!btcQuiz.solved}>Continue</Cta>
          </>
        ) : null}

        {step === "quick" ? (
          <div className={styles.centered}>
            <h1 className={styles.title}>Quick Check</h1>
            <p className={styles.quickLead}>A YES contract costs:</p>
            <p className={styles.quickPrice}>70¢</p>
            <p className={styles.quickAsk}>If YES happens, what is the contract worth when the market resolves?</p>
            <div className={styles.options}>
              <Option center tone="green" label="$0.70" state={quickQuiz.stateOf("cost")} onClick={() => quickQuiz.choose("cost")} />
              <Option center tone="green" icon={quickQuiz.solved ? <CheckIcon /> : undefined} label="$1.00" state={quickQuiz.stateOf("one")} onClick={() => quickQuiz.choose("one")} />
              <Option center tone="green" label="$1.70" state={quickQuiz.stateOf("more")} onClick={() => quickQuiz.choose("more")} />
            </div>
            {quickQuiz.solved ? (
              <div className={styles.feedback} data-tone="green">
                <span className={styles.feedbackIcon}><CheckIcon /></span>
                <div>
                  <strong>Correct!</strong>
                  <p>You paid 70¢. If you’re right:</p>
                  <p>$1.00 − $0.70 = <b>+$0.30</b></p>
                </div>
              </div>
            ) : quickQuiz.missed ? (
              <p className={styles.hint}>Not quite. A winning YES contract pays out a fixed amount.</p>
            ) : null}
            <Cta onClick={next} disabled={!quickQuiz.solved}>Continue</Cta>
          </div>
        ) : null}

        {step === "inflation" ? (
          <>
            <h1 className={styles.title}>Would you trade this market?</h1>
            <div className={styles.badMarket}>
              <span className={styles.badge} data-tone="red">Bad Market</span>
              <p>“Will inflation be <mark>high</mark> in December?”</p>
            </div>
            <div className={styles.options}>
              <Option icon={<ClockIcon />} label="Looks fine" state={inflationQuiz.stateOf("fine")} onClick={() => inflationQuiz.choose("fine")} />
              <Option icon={<WarnIcon />} tone="amber" label="Something is unclear" state={inflationQuiz.stateOf("unclear")} onClick={() => inflationQuiz.choose("unclear")} />
            </div>
            {inflationQuiz.solved ? (
              <div className={styles.feedback} data-tone="red">
                <span className={styles.feedbackIcon}><CrossIcon /></span>
                <div>
                  <p>Exactly. What does “high” mean? 2%? 3%? 10%?</p>
                  <p className={styles.feedbackMuted}>A market needs a clear way to determine the winner.</p>
                </div>
              </div>
            ) : inflationQuiz.missed ? (
              <p className={styles.hint}>Look again. Could two people disagree on what “high” means?</p>
            ) : null}
            <Cta onClick={next} disabled={!inflationQuiz.solved}>Show a better example</Cta>
          </>
        ) : null}

        {step === "better" ? (
          <>
            <h1 className={styles.title}>A better market</h1>
            <div className={styles.goodMarket}>
              <span className={styles.badge} data-tone="green">Good Market</span>
              <p>Will December 2026 CPI inflation exceed 3.0%, according to the U.S. Bureau of Labor Statistics?</p>
              <dl className={styles.facts}>
                <div>
                  <span className={styles.factIcon}><CalendarIcon /></span>
                  <dt>WHEN</dt>
                  <dd>December 2026</dd>
                </div>
                <div>
                  <span className={styles.factIcon}><BarsIcon /></span>
                  <dt>THRESHOLD</dt>
                  <dd>Above 3.0%</dd>
                </div>
                <div>
                  <span className={styles.factIcon}><BankIcon /></span>
                  <dt>SOURCE</dt>
                  <dd>U.S. Bureau of Labor Statistics</dd>
                </div>
              </dl>
            </div>
            <div className={styles.infoBox}>
              <InfoIcon />
              <p>Every good prediction market needs a clear question, deadline and resolution source.</p>
            </div>
            <Cta onClick={next}>Continue</Cta>
          </>
        ) : null}

        {step === "final" ? (
          <>
            <h1 className={styles.title}>Final Challenge</h1>
            <div className={styles.finalHead}>
              <Image src="/helmet-chiefs.png" alt="Kansas City Chiefs helmet" width={500} height={424} className={styles.helmetSmall} />
              <div className={styles.finalPrice}>
                <span>{finalSide.side}</span>
                <strong>{finalSide.price}¢</strong>
              </div>
            </div>
            <div className={styles.compareRow}>
              <div className={styles.statBox} data-tone="green">
                <span>YOUR ESTIMATE</span>
                <strong>{estimate}%</strong>
              </div>
              <div className={styles.statBox} data-tone="blue">
                <span>MARKET</span>
                <strong>{MARKET_PRICE}%</strong>
              </div>
            </div>
            <h2 className={styles.prompt}>Why would this trade potentially make sense?</h2>
            <div className={styles.options}>
              <Option icon={<HeartIcon />} label="I want the Chiefs to win" state={finalQuiz.stateOf("want")} onClick={() => finalQuiz.choose("want")} />
              <Option icon={<FootballIcon />} label="I think the Chiefs will win" state={finalQuiz.stateOf("win")} onClick={() => finalQuiz.choose("win")} />
              <Option tone="green" icon={<BarsIcon />} label={edgeLabel} state={finalQuiz.stateOf("edge")} onClick={() => finalQuiz.choose("edge")} />
            </div>
            {finalQuiz.missed && !finalQuiz.solved ? <p className={styles.hint}>Not quite. A trade needs a gap between your estimate and the price.</p> : null}
            <Cta onClick={next} disabled={!finalQuiz.solved}>See the takeaway</Cta>
          </>
        ) : null}

        {step === "done" ? (
          <div className={styles.centered}>
            <p className={styles.kicker}>{lessonKicker}</p>
            <p className={styles.verdict}>
              <span className={styles.verdictIcon}><CheckIcon /></span>
              Lesson complete
            </p>
            <div className={styles.note}>
              <p>A price is the market’s probability. A {MARKET_PRICE}¢ YES contract means the market gives the Chiefs about a {MARKET_PRICE}% chance.</p>
              <p>A trade can make sense when your estimate is meaningfully different from the price, and the market has a clear question, deadline and resolution source.</p>
            </div>
            {onNextLesson ? (
              <Cta onClick={onNextLesson}>
                Next lesson <ArrowIcon />
              </Cta>
            ) : null}
            <button type="button" className={styles.ghost} onClick={onRestart}>Restart lesson</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
