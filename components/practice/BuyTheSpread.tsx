"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import flow from "../LessonFlow.module.css";
import styles from "./Practice.module.css";
import { clamp, formatCents, formatSignedCents, formatUsd } from "./engine";
import {
  DISPLAYED_PRICE,
  HISTORY_SPAN,
  MISSION_SIZE,
  SECONDS_PER_TICK,
  TICKS_PER_WAIT,
  TOTAL_TICKS,
  advanceTick,
  aggregateFills,
  bestBidOf,
  cancelOrder,
  closeOpenOrders,
  createBook,
  createLimitOrder,
  displayBook,
  markMarketOrder,
  openOrders,
  previewBuy,
  restLimitOrder,
  summarize,
  takeBestAsk,
  type BookState,
  type Level,
  type Scenario,
  type TickReport,
} from "./orderBook";
import { PriceChart, type ChartLine, type ChartMarker } from "./PriceChart";
import {
  ActionBar,
  ArrowIcon,
  BoltIcon,
  CheckIcon,
  ChoiceCard,
  ChoiceGroup,
  ClockIcon,
  Cta,
  Disclosure,
  Ghost,
  Note,
  NumberedList,
  Progress,
  ReplayIcon,
  SecondaryButton,
  SectionLabel,
  Stat,
  StepHeader,
  YourMove,
  scrollPageTop,
  scrollToRef,
} from "./ui";

type Step = "intro" | "trade" | "report" | "done";
const STEPS: Step[] = ["intro", "trade", "report", "done"];

type LessonProps = { lessonNumber: number; lessonTotal: number; onNextLesson?: () => void };
type OrderType = "market" | "limit";
type FeedTone = "good" | "warn" | "info" | "news";
type FeedItem = { id: number; tone: FeedTone; title: string; body: string };
type Execution = {
  kind: OrderType;
  orderId: number | null;
  requested: number;
  remaining: number;
  limit: number;
  levels: Level[];
  bestAskAtStart: number | null;
};
type Attempt = {
  id: number;
  scenario: Scenario;
  filled: number;
  average: number | null;
  cost: number;
  slippage: number | null;
  usedMarket: boolean;
  usedLimit: boolean;
  fills: ReturnType<typeof aggregateFills>;
};

const SCENARIOS: Record<Scenario, { name: string; blurb: string }> = {
  quiet: { name: "Quiet market", blurb: "Prices drift gradually. Sellers come and go." },
  news: { name: "Breaking news", blurb: "Something big may hit before kickoff. Liquidity can vanish." },
};

const EXECUTION_STEP_MS = 260;
const TICK_MS = 380;

function clockLabel(ticksLeft: number): string {
  const seconds = Math.max(0, ticksLeft) * SECONDS_PER_TICK;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function contracts(count: number): string {
  return `${count} contract${count === 1 ? "" : "s"}`;
}

function breakdown(levels: Level[]): string {
  return levels.map((level) => `${level.size} @ ${level.price}¢`).join(" · ");
}

function strategyOf(attempt: Pick<Attempt, "usedMarket" | "usedLimit">): string {
  if (attempt.usedMarket && attempt.usedLimit) return "Market + limit";
  if (attempt.usedMarket) return "Market only";
  if (attempt.usedLimit) return "Limit only";
  return "No orders";
}

function describeExecution(execution: Execution, book: BookState): Omit<FeedItem, "id"> {
  const filled = execution.levels.reduce((sum, level) => sum + level.size, 0);
  const average = filled ? execution.levels.reduce((sum, level) => sum + level.price * level.size, 0) / filled : null;
  const reference = execution.bestAskAtStart;

  if (execution.kind === "market") {
    if (filled === 0 || average === null) return { tone: "warn", title: "No sellers to buy from", body: "The book had no offers left, so nothing executed." };
    const shortfall = execution.remaining > 0 ? ` ${execution.remaining} couldn’t fill: the book ran out of sellers.` : "";
    if (execution.levels.length === 1) {
      return {
        tone: "good",
        title: `Filled ${filled} at ${execution.levels[0].price}¢`,
        body: `Your order fit inside the best offer, so every contract cost the price you saw. No slippage.${shortfall}`,
      };
    }
    const first = execution.levels[0];
    return {
      tone: "warn",
      title: `Your market order walked the book · avg ${formatCents(average, 2)}`,
      body: `Only ${first.size} were offered at ${first.price}¢, so the order kept buying higher: ${breakdown(execution.levels)}. That’s ${formatSignedCents(
        average - (reference ?? first.price),
        2,
      )} of slippage per contract versus the ${reference ?? first.price}¢ you saw.${shortfall}`,
    };
  }

  const order = book.orders.find((entry) => entry.id === execution.orderId);
  const resting = execution.remaining;
  if (filled === 0) {
    const ahead = order?.ahead ?? 0;
    return {
      tone: "info",
      title: `Bid resting at ${execution.limit}¢`,
      body: `Sellers are asking ${reference ?? "more"}¢, so nothing trades yet. ${
        ahead > 0 ? `${contracts(ahead)} from other buyers ${ahead === 1 ? "is" : "are"} ahead of you at ${execution.limit}¢.` : `You’re first in line at ${execution.limit}¢.`
      } The price line didn’t move, because no trade happened.`,
    };
  }
  if (resting === 0) {
    return {
      tone: "good",
      title: `Limit filled: ${filled} at avg ${formatCents(average ?? 0, 2)}`,
      body: `Your ${execution.limit}¢ limit was at or above the asks, so it executed immediately: ${breakdown(execution.levels)}. A limit never pays more than its price.`,
    };
  }
  return {
    tone: "info",
    title: `Partial fill: ${filled} filled, ${resting} waiting`,
    body: `${breakdown(execution.levels)} executed at or below your ${execution.limit}¢ limit. The other ${resting} are resting in the book at ${execution.limit}¢ until a seller comes down to it.`,
  };
}

/** Returns feed items most-important first: kickoff, then news, then fills or status. */
function describeWait(log: TickReport[], book: BookState): Omit<FeedItem, "id">[] {
  const items: Omit<FeedItem, "id">[] = [];
  const news = log.find((report) => report.headline);
  const fills = log.flatMap((report) => report.myFills);
  const filled = fills.reduce((sum, level) => sum + level.size, 0);
  const expired = log.reduce((sum, report) => sum + report.expired, 0);
  const last = log[log.length - 1];
  const waiting = openOrders(book);

  if (news) {
    const spread = news.bestAsk !== null && news.bestBid !== null ? news.bestAsk - news.bestBid : null;
    items.push({
      tone: "news",
      title: `Breaking: ${news.headline}`,
      body: `Sellers pulled every offer below ${news.bestAsk ?? "—"}¢ and re-posted higher. ${spread !== null ? `The spread blew out from 1¢ to ${spread}¢. ` : ""}Decide: pay up now, adjust your limit, or wait.`,
    });
  }
  if (filled > 0) {
    const merged = fills.reduce<Level[]>((all, level) => {
      const existing = all.find((entry) => entry.price === level.price);
      if (existing) existing.size += level.size;
      else all.push({ ...level });
      return all;
    }, []);
    items.push({ tone: "good", title: `${filled} of your ${filled === 1 ? "contract" : "contracts"} filled while you waited`, body: `${breakdown(merged)}. A seller came down to your price or sold into your bid.` });
  } else if (waiting.length > 0 && !news) {
    const top = [...waiting].sort((a, b) => b.price - a.price)[0];
    items.push({
      tone: "info",
      title: "No fills yet",
      body: `Your ${top.price}¢ bid ${top.ahead > 0 ? `still has ${contracts(top.ahead)} ahead of it in line` : "is first in line"}. Best ask is now ${last?.bestAsk ?? "—"}¢.`,
    });
  } else if (!news && last) {
    const before = log[0]?.askBefore;
    items.push({
      tone: "info",
      title: `15 seconds pass · best ask ${last.bestAsk ?? "—"}¢`,
      body:
        before !== null && before !== undefined && last.bestAsk !== null && before !== last.bestAsk
          ? `Other traders bought and sold, and the best offer moved from ${before}¢ to ${last.bestAsk}¢.`
          : "Other traders bought and sold. The best offer held steady.",
    });
  }
  if (book.tick >= TOTAL_TICKS) {
    items.unshift({
      tone: "warn",
      title: "Kickoff: the trading window closed",
      body: expired > 0 ? `${contracts(expired)} left unfilled in your open orders ${expired === 1 ? "was" : "were"} cancelled. Waiting for a better price can mean never getting filled.` : "The pre-game window is over.",
    });
  }
  return items;
}

/* ---------- small controls ---------- */

function Stepper({ value, min, max, onChange, label, suffix, disabled }: { value: number; min: number; max: number; onChange: (value: number) => void; label: string; suffix?: string; disabled?: boolean }) {
  const set = (next: number) => onChange(clamp(Math.round(next), min, Math.max(min, max)));
  return (
    <div className={styles.stepper} data-disabled={disabled}>
      <button type="button" onClick={() => set(value - 1)} disabled={disabled || value <= min} aria-label={`Decrease ${label}`}>
        −
      </button>
      <span className={styles.stepperValue}>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          aria-label={label}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            if (Number.isFinite(parsed)) set(parsed);
          }}
        />
        {suffix ? <i>{suffix}</i> : null}
      </span>
      <button type="button" onClick={() => set(value + 1)} disabled={disabled || value >= max} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  );
}

function OrderBookView({ book, executing }: { book: BookState; executing: boolean }) {
  const rows = 6;
  const { asks, bids, hiddenMine } = displayBook(book, rows);
  const maxSize = Math.max(1, ...asks.map((level) => level.size), ...bids.map((level) => level.size));
  const bestAsk = asks[0]?.price;
  const bestBid = bids[0]?.price;
  const askRows = [...asks].reverse();
  const askPadding = Math.max(0, rows - askRows.length);
  const bidPadding = Math.max(0, rows - bids.length);

  return (
    <div className={styles.book} aria-label="Order book" data-executing={executing}>
      <div className={styles.bookTop}>
        <p className={styles.sectionLabel}>Order book</p>
        <span>Price · Contracts</span>
      </div>
      <p className={styles.bookLabel} data-side="ask">
        Sellers <span>· cheapest at the bottom</span>
      </p>
      <div className={styles.bookSide} data-side="ask">
        {Array.from({ length: askPadding }, (_, index) => (
          <div key={`ask-pad-${index}`} className={styles.bookRow} data-empty="true" />
        ))}
        {askRows.map((level) => (
          <div key={`ask-${level.price}`} className={styles.bookRow} data-side="ask" data-best={level.price === bestAsk}>
            <span className={styles.bookDepth} style={{ width: `${(level.size / maxSize) * 100}%` }} />
            <span key={level.size} className={styles.bookFlash} />
            <span className={styles.bookPrice}>{level.price}¢</span>
            <span className={styles.bookSize}>{level.size}</span>
          </div>
        ))}
      </div>
      <div className={styles.bookSpread}>
        <span>Spread {bestAsk !== undefined && bestBid !== undefined ? `${bestAsk - bestBid}¢` : "—"}</span>
        <span>Last trade {book.lastPrice}¢</span>
      </div>
      <div className={styles.bookSide} data-side="bid">
        {bids.map((level) => (
          <div key={`bid-${level.price}`} className={styles.bookRow} data-side="bid" data-mine={level.mine > 0}>
            <span className={styles.bookDepth} style={{ width: `${(level.size / maxSize) * 100}%` }} />
            <span key={level.size} className={styles.bookFlash} />
            <span className={styles.bookPrice}>{level.price}¢</span>
            <span className={styles.bookSize}>
              {level.mine > 0 ? <em>You {level.mine}</em> : null}
              {level.size}
            </span>
          </div>
        ))}
        {Array.from({ length: bidPadding }, (_, index) => (
          <div key={`bid-pad-${index}`} className={styles.bookRow} data-empty="true" />
        ))}
      </div>
      <p className={styles.bookLabel} data-side="bid">
        Buyers <span>· highest at the top</span>
      </p>
      {hiddenMine.length > 0 ? (
        <p className={styles.bookNote}>
          Your bid at {hiddenMine.map((order) => `${order.price}¢`).join(", ")} sits below the visible book. Sellers won’t reach it unless prices fall.
        </p>
      ) : null}
    </div>
  );
}

/* ---------- lesson ---------- */

type HeaderProps = { kicker: string; step: number; total: number };
type GuideTarget = "ticket" | "wait" | "book" | null;

export function BuyTheSpread({ lessonNumber, lessonTotal, onNextLesson }: LessonProps) {
  const [step, setStep] = useState<Step>("intro");
  const [scenario, setScenario] = useState<Scenario>("quiet");
  const [book, setBook] = useState<BookState>(() => createBook("quiet"));
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [quantity, setQuantity] = useState(MISSION_SIZE);
  const [limitPrice, setLimitPrice] = useState(59);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [pendingTicks, setPendingTicks] = useState(0);
  const [waitLog, setWaitLog] = useState<TickReport[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const feedId = useRef(0);
  const ticketRef = useRef<HTMLDivElement>(null);
  const waitRef = useRef<HTMLButtonElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const kicker = `Lesson ${lessonNumber} · Practice`;
  const header: HeaderProps = { kicker, step: STEPS.indexOf(step) + 1, total: STEPS.length };

  function pushFeed(items: Omit<FeedItem, "id">[]) {
    const stamped = items.map((item) => {
      feedId.current += 1;
      return { ...item, id: feedId.current };
    });
    setFeed((current) => [...stamped, ...current].slice(0, 5));
  }

  // Walks the book one price level per step so the student can watch liquidity being consumed.
  useEffect(() => {
    if (!execution) return;
    const timer = window.setTimeout(
      () => {
        const { state, taken } = takeBestAsk(book, execution.remaining, execution.limit, execution.kind, execution.orderId);
        const next: Execution = taken ? { ...execution, remaining: execution.remaining - taken.size, levels: [...execution.levels, taken] } : execution;
        if (taken && next.remaining > 0) {
          setBook(state);
          setExecution(next);
          return;
        }
        const settled = next.kind === "limit" && next.orderId !== null ? restLimitOrder(state, next.orderId) : state;
        setBook(settled);
        setExecution(null);
        pushFeed([describeExecution(next, settled)]);
      },
      execution.levels.length === 0 ? 140 : EXECUTION_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [execution, book]);

  // Advances simulated time one tick per TICK_MS until the requested wait is used up.
  useEffect(() => {
    if (pendingTicks <= 0) return;
    const timer = window.setTimeout(() => {
      const { state, report } = advanceTick(book);
      const log = [...waitLog, report];
      setBook(state);
      if (pendingTicks === 1 || state.tick >= TOTAL_TICKS) {
        setWaitLog([]);
        setPendingTicks(0);
        pushFeed(describeWait(log, state));
      } else {
        setWaitLog(log);
        setPendingTicks(pendingTicks - 1);
      }
    }, TICK_MS);
    return () => window.clearTimeout(timer);
  }, [pendingTicks, book, waitLog]);

  const summary = summarize(book);
  const available = MISSION_SIZE - summary.filled - summary.reserved;
  const orderQuantity = clamp(quantity, 1, Math.max(1, available));
  const busy = execution !== null || pendingTicks > 0;
  const closed = book.tick >= TOTAL_TICKS;
  const missionDone = summary.filled >= MISSION_SIZE;
  const bestAsk = book.asks[0]?.price ?? null;
  const bestBid = bestBidOf(book);
  const resting = useMemo(() => openOrders(book), [book]);
  const preview = previewBuy(book, orderQuantity, orderType === "market" ? 99 : limitPrice);
  const canTrade = !busy && !closed && !missionDone && available > 0;
  const canWait = !busy && !closed && !missionDone;
  const latest = feed[0];

  const chartLines = useMemo<ChartLine[]>(() => {
    const lines: ChartLine[] = resting.map((order) => ({
      price: order.price,
      tone: "green",
      tag: "You",
      label: `Your bid ${order.price}¢ · ${order.quantity - order.filled} waiting`,
    }));
    if (bestAsk !== null) lines.push({ price: bestAsk, tone: "red", tag: `Ask ${bestAsk}` });
    if (bestBid !== null && !resting.some((order) => order.price === bestBid)) lines.push({ price: bestBid, tone: "green", tag: `Bid ${bestBid}` });
    return lines;
  }, [resting, bestAsk, bestBid]);

  const chartMarkers = useMemo<ChartMarker[]>(() => book.fills.map((fill) => ({ x: fill.x, price: fill.price, kind: "buy", weight: fill.quantity })), [book.fills]);

  const guide: { text: ReactNode; target: GuideTarget } = execution
    ? { text: "Watch the order book: your order buys from the cheapest seller first, then moves up one price at a time.", target: "book" }
    : pendingTicks > 0
      ? { text: "Time is passing. Other traders are buying, selling and changing their prices.", target: null }
      : missionDone
        ? { text: "Mission complete. Open your execution report to see how well you bought.", target: null }
        : closed
          ? { text: "Kickoff: trading is closed. Open your report to see what waiting cost you.", target: null }
          : resting.length > 0 && available <= 0
            ? {
                text: (
                  <>
                    Your bids are waiting in line. Tap <b>Let 15 seconds pass</b> to see if sellers come to your price, or cancel a bid to change plans.
                  </>
                ),
                target: "wait",
              }
            : resting.length > 0
              ? {
                  text: (
                    <>
                      Your bid is waiting. Buy the rest now, or tap <b>Let 15 seconds pass</b> and see if it fills.
                    </>
                  ),
                  target: "wait",
                }
              : summary.filled > 0
                ? {
                    text: (
                      <>
                        You still need <b>{available}</b> more. Place another order, or let time pass and watch the prices.
                      </>
                    ),
                    target: "ticket",
                  }
                : {
                    text: (
                      <>
                        Choose <b>Market</b> (buy now) or <b>Limit</b> (pick your price), set how many, then tap the green button.
                      </>
                    ),
                    target: "ticket",
                  };
  const guideRef = guide.target === "ticket" ? ticketRef : guide.target === "wait" ? waitRef : guide.target === "book" ? bookRef : null;

  function go(next: Step) {
    setStep(next);
    scrollPageTop();
  }

  function startAttempt(nextScenario: Scenario) {
    setScenario(nextScenario);
    setBook(createBook(nextScenario));
    setFeed([]);
    setExecution(null);
    setPendingTicks(0);
    setWaitLog([]);
    setQuantity(MISSION_SIZE);
    setLimitPrice(59);
    go("trade");
  }

  function submit() {
    if (!canTrade) return;
    if (orderType === "market") {
      setBook(markMarketOrder(book));
      setExecution({ kind: "market", orderId: null, requested: orderQuantity, remaining: orderQuantity, limit: 99, levels: [], bestAskAtStart: bestAsk });
      return;
    }
    const { state, orderId, merged } = createLimitOrder(book, orderQuantity, limitPrice);
    setBook(state);
    if (merged) {
      pushFeed([{ tone: "info", title: `Added ${orderQuantity} to your ${limitPrice}¢ bid`, body: "Same price, same place in line for the original contracts. The new ones wait behind them." }]);
      return;
    }
    setExecution({ kind: "limit", orderId, requested: orderQuantity, remaining: orderQuantity, limit: limitPrice, levels: [], bestAskAtStart: bestAsk });
  }

  function cancel(orderId: number) {
    const order = book.orders.find((entry) => entry.id === orderId);
    setBook(cancelOrder(book, orderId));
    if (order) pushFeed([{ tone: "info", title: `Cancelled your ${order.price}¢ bid`, body: `${contracts(order.quantity - order.filled)} freed up. ${order.filled} that already filled stay in your portfolio.` }]);
  }

  function finish() {
    const { state } = closeOpenOrders(book, "cancelled");
    const result = summarize(state);
    setBook(state);
    setAttempts((current) => [
      ...current,
      {
        id: current.length + 1,
        scenario,
        filled: result.filled,
        average: result.average,
        cost: result.cost,
        slippage: result.slippage,
        usedMarket: state.placedMarket,
        usedLimit: state.placedLimit,
        fills: aggregateFills(state.fills),
      },
    ]);
    go("report");
  }

  const usedMarketEver = attempts.some((attempt) => attempt.usedMarket);
  const usedLimitEver = attempts.some((attempt) => attempt.usedLimit);
  const complete = usedMarketEver && usedLimitEver && attempts.length > 0;
  const lastAttempt = attempts[attempts.length - 1];

  const buyLabel = execution
    ? "Buying…"
    : missionDone
      ? "Mission complete"
      : closed
        ? "Trading closed at kickoff"
        : available <= 0
          ? "All 100 are bought or waiting"
          : orderType === "market"
            ? `Buy ${orderQuantity} now at market`
            : `Place bid: ${orderQuantity} at ${limitPrice}¢`;

  return (
    <div className={`${flow.flow} ${styles.sim} ${styles.simWide}`}>
      <Progress index={STEPS.indexOf(step)} total={STEPS.length} />

      <div className={flow.screen} key={step === "trade" ? `trade-${attempts.length}` : step}>
        {step === "intro" ? (
          <>
            <StepHeader
              {...header}
              title="Buy the Spread"
              lead={
                <>
                  Your mission: <b className={styles.highlight}>buy 100 YES contracts at the best average price you can.</b>
                </>
              }
            />
            <Disclosure title="How it works">
              <NumberedList
                items={[
                  <>
                    Sellers list their prices in the <b>order book</b>. The cheapest one sets the price you see: 60¢.
                  </>,
                  <>
                    A <b>market order</b> buys right now. Big orders run out of cheap sellers and climb to higher prices.
                  </>,
                  <>
                    A <b>limit order</b> sets your maximum price and waits in line until a seller agrees. It might not fill.
                  </>,
                ]}
              />
            </Disclosure>
            <SectionLabel hint="Choose one">Pick a market</SectionLabel>
            <ChoiceGroup label="Market scenario">
              <ChoiceCard icon={<ClockIcon />} selected={scenario === "quiet"} onSelect={() => setScenario("quiet")} badge="Start here" title={SCENARIOS.quiet.name} description={SCENARIOS.quiet.blurb} />
              <ChoiceCard icon={<BoltIcon />} selected={scenario === "news"} onSelect={() => setScenario("news")} title={SCENARIOS.news.name} description={SCENARIOS.news.blurb} />
            </ChoiceGroup>
            <Note>
              <p>There’s no single right answer. Try different strategies; you can replay as often as you like.</p>
            </Note>
            <ActionBar>
              <Cta onClick={() => startAttempt(scenario)}>
                Start trading · {SCENARIOS[scenario].name} <ArrowIcon />
              </Cta>
            </ActionBar>
          </>
        ) : null}

        {step === "trade" ? (
          <>
            <StepHeader {...header} title="Buy 100 YES at the best average" />

            <div className={styles.mission}>
              <div className={styles.missionTrack}>
                <span style={{ width: `${(summary.filled / MISSION_SIZE) * 100}%` }} />
                <span className={styles.missionReserved} style={{ left: `${(summary.filled / MISSION_SIZE) * 100}%`, width: `${(summary.reserved / MISSION_SIZE) * 100}%` }} />
              </div>
              <p>
                <b>{summary.filled}</b> / {MISSION_SIZE} bought{summary.reserved > 0 ? ` · ${summary.reserved} waiting` : ""}
              </p>
            </div>

            <YourMove onShow={guideRef ? () => scrollToRef(guideRef, guide.target === "wait" ? "center" : "start") : undefined}>{guide.text}</YourMove>

            <section className={styles.terminal} aria-label="Trading screen">
              <div className={styles.termMarket}>
                <p>
                  Chiefs to win vs Bills? <small>{SCENARIOS[scenario].name}</small>
                </p>
                <span>
                  Last trade <b>{book.lastPrice}¢</b>
                </span>
              </div>
              <PriceChart
                points={book.series}
                xDomain={[0, Math.max(HISTORY_SPAN + TOTAL_TICKS, book.cursor)]}
                minSpan={10}
                lines={chartLines}
                markers={chartMarkers}
                events={book.newsX !== null ? [{ x: book.newsX, label: "QB OUT", tone: "amber" }] : undefined}
                height="clamp(140px, 22vh, 200px)"
                live={!closed}
                futureLabel={closed ? undefined : "until kickoff"}
                label={`YES last traded at ${book.lastPrice} cents`}
              />
              <div className={styles.timeBar}>
                <span className={styles.timeLabel}>
                  <ClockIcon /> {closed ? "Trading closed" : `${clockLabel(TOTAL_TICKS - book.tick)} until kickoff`}
                </span>
                <div className={styles.timeTrack}>
                  <span style={{ width: `${(book.tick / TOTAL_TICKS) * 100}%` }} />
                </div>
              </div>

              <div className={styles.termGrid}>
                <div ref={bookRef} className={styles.revealTarget}>
                  <OrderBookView book={book} executing={execution !== null} />
                </div>

                <div ref={ticketRef} className={`${styles.ticket} ${styles.revealTarget}`}>
                  <p className={styles.sectionLabel}>Your order</p>
                  <ChoiceGroup label="Order type" columns={2}>
                    <ChoiceCard compact selected={orderType === "market"} onSelect={() => setOrderType("market")} title="Market" description="Buy now at the best prices" disabled={!canTrade} />
                    <ChoiceCard compact selected={orderType === "limit"} onSelect={() => setOrderType("limit")} title="Limit" description="Set your price and wait" disabled={!canTrade} />
                  </ChoiceGroup>

                  <div className={styles.field}>
                    <span>How many?</span>
                    <Stepper value={orderQuantity} min={1} max={Math.max(1, available)} onChange={setQuantity} label="contracts" disabled={!canTrade} />
                  </div>
                  <div className={styles.chips}>
                    {[10, 25, 50].map((size) => (
                      <button key={size} type="button" onClick={() => setQuantity(size)} disabled={!canTrade || size > available} data-active={orderQuantity === size}>
                        {size}
                      </button>
                    ))}
                    <button type="button" onClick={() => setQuantity(available)} disabled={!canTrade} data-active={orderQuantity === available}>
                      All {Math.max(0, available)}
                    </button>
                  </div>

                  {orderType === "limit" ? (
                    <>
                      <div className={styles.field}>
                        <span>Your max price</span>
                        <Stepper value={limitPrice} min={1} max={99} onChange={setLimitPrice} label="limit price" suffix="¢" disabled={!canTrade} />
                      </div>
                      <div className={styles.chips}>
                        {bestBid !== null ? (
                          <button type="button" onClick={() => setLimitPrice(bestBid)} disabled={!canTrade} data-active={limitPrice === bestBid}>
                            Best bid {bestBid}¢
                          </button>
                        ) : null}
                        {bestAsk !== null ? (
                          <button type="button" onClick={() => setLimitPrice(bestAsk)} disabled={!canTrade} data-active={limitPrice === bestAsk}>
                            Best ask {bestAsk}¢
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  <div className={styles.preview} data-tone={orderType === "market" && preview.levels.length > 1 ? "warn" : "info"}>
                    <span className={styles.previewLabel}>What will happen</span>
                    {!canTrade ? (
                      <p>{available <= 0 && !missionDone && !closed ? "All 100 contracts are bought or waiting in your bids." : "No order to preview right now."}</p>
                    ) : orderType === "market" ? (
                      preview.filled === 0 || preview.average === null ? (
                        <p>No sellers available right now.</p>
                      ) : (
                        <>
                          <p>
                            Buys <b>{preview.filled}</b> right now at an average of <b>{formatCents(preview.average, 2)}</b>.
                          </p>
                          <p>
                            {preview.levels.length > 1
                              ? `Runs through ${preview.levels.length} sellers, up to ${preview.levels[preview.levels.length - 1].price}¢. That’s ${formatSignedCents(preview.average - (bestAsk ?? preview.average), 2)} slippage.`
                              : "Fits inside the cheapest seller’s offer. No slippage."}
                          </p>
                        </>
                      )
                    ) : preview.filled === 0 ? (
                      <>
                        <p>
                          Waits in line at <b>{limitPrice}¢</b>. Nothing buys yet.
                        </p>
                        <p>It fills only if a seller accepts {limitPrice}¢ or less.</p>
                      </>
                    ) : preview.filled >= orderQuantity ? (
                      <>
                        <p>
                          Buys all <b>{orderQuantity}</b> right now at an average of <b>{formatCents(preview.average ?? 0, 2)}</b>.
                        </p>
                        <p>Never above your {limitPrice}¢ limit.</p>
                      </>
                    ) : (
                      <>
                        <p>
                          Buys <b>{preview.filled}</b> now. The other <b>{orderQuantity - preview.filled}</b> wait in line at {limitPrice}¢.
                        </p>
                        <p>That’s a partial fill.</p>
                      </>
                    )}
                  </div>

                  <button type="button" className={`${styles.buyButton} ${guide.target === "ticket" && summary.filled === 0 && resting.length === 0 ? styles.guided : ""}`} onClick={submit} disabled={!canTrade}>
                    {buyLabel}
                  </button>
                  <button
                    ref={waitRef}
                    type="button"
                    className={`${styles.waitButton} ${styles.revealTarget} ${guide.target === "wait" ? styles.guided : ""}`}
                    onClick={() => setPendingTicks(Math.min(TICKS_PER_WAIT, TOTAL_TICKS - book.tick))}
                    disabled={!canWait}
                  >
                    <ClockIcon />
                    {pendingTicks > 0 ? "Time passing…" : `Let ${TICKS_PER_WAIT * SECONDS_PER_TICK} seconds pass`}
                  </button>

                  {latest ? (
                    <div className={styles.result} data-tone={latest.tone} key={latest.id} aria-live="polite">
                      <span className={styles.previewLabel}>What just happened</span>
                      <strong>
                        {latest.tone === "news" ? <BoltIcon /> : null}
                        {latest.title}
                      </strong>
                      <p>{latest.body}</p>
                    </div>
                  ) : (
                    <div className={styles.result} data-tone="info">
                      <span className={styles.previewLabel}>Right now</span>
                      <p>20 contracts are offered at 60¢, then more at higher prices. Other buyers bid 59¢ and below.</p>
                    </div>
                  )}

                  {resting.length > 0 ? (
                    <div className={styles.openOrders}>
                      <p className={styles.sectionLabel}>Your waiting bids</p>
                      {resting.map((order) => (
                        <div key={order.id} className={styles.openOrder}>
                          <span>
                            <b>Bid {order.price}¢</b>
                            <small>
                              {order.filled}/{order.quantity} filled · {order.ahead > 0 ? `${contracts(order.ahead)} ahead of you` : "first in line"}
                            </small>
                          </span>
                          <button type="button" onClick={() => cancel(order.id)} disabled={busy}>
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <SectionLabel>Your results so far</SectionLabel>
            <div className={styles.statRow}>
              <Stat label="Bought" value={`${summary.filled}/${MISSION_SIZE}`} />
              <Stat label="Avg price" value={summary.average === null ? "—" : formatCents(summary.average, 2)} />
              <Stat label="Total cost" value={formatUsd(summary.cost)} />
              <Stat
                label={`vs ${DISPLAYED_PRICE}¢ shown`}
                value={summary.slippage === null ? "—" : formatSignedCents(summary.slippage, 2)}
                tone={summary.slippage === null ? undefined : summary.slippage > 0.005 ? "red" : "green"}
              />
            </div>

            {feed.length > 1 ? (
              <>
                <SectionLabel>Earlier</SectionLabel>
                <ol className={styles.activity}>
                  {feed.slice(1).map((item) => (
                    <li key={item.id} data-tone={item.tone}>
                      {item.title}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}

            {missionDone || closed ? (
              <ActionBar>
                <Cta onClick={finish} disabled={busy}>
                  See execution report <ArrowIcon />
                </Cta>
              </ActionBar>
            ) : (
              <div className={styles.finishRow}>
                <Ghost onClick={finish}>Stop here and see my report</Ghost>
              </div>
            )}
          </>
        ) : null}

        {step === "report" && lastAttempt ? (
          <ReportScreen
            header={header}
            attempt={lastAttempt}
            attempts={attempts}
            usedMarketEver={usedMarketEver}
            usedLimitEver={usedLimitEver}
            complete={complete}
            onReplay={startAttempt}
            onFinish={() => go("done")}
          />
        ) : null}

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
              <p className={styles.mantra}>A displayed price of 60¢ doesn’t mean you’ll pay 60¢ for every contract.</p>
            </div>
            <div className={styles.summary}>
              <p>What you actually pay depends on liquidity, order size, order type and timing.</p>
              <p>
                <b>Market orders</b> buy certainty of execution and pay for it in slippage. <b>Limit orders</b> protect your price but may fill partly, or not at all. When news hits, liquidity
                vanishes and spreads widen, so decide whether speed is worth the cost.
              </p>
            </div>
            <ActionBar>
              {onNextLesson ? (
                <Cta onClick={onNextLesson}>
                  Next lesson <ArrowIcon />
                </Cta>
              ) : null}
              <Ghost onClick={() => startAttempt("quiet")}>
                <ReplayIcon /> Practice again
              </Ghost>
            </ActionBar>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- report ---------- */

function ReportScreen({
  header,
  attempt,
  attempts,
  usedMarketEver,
  usedLimitEver,
  complete,
  onReplay,
  onFinish,
}: {
  header: HeaderProps;
  attempt: Attempt;
  attempts: Attempt[];
  usedMarketEver: boolean;
  usedLimitEver: boolean;
  complete: boolean;
  onReplay: (scenario: Scenario) => void;
  onFinish: () => void;
}) {
  const unfilled = MISSION_SIZE - attempt.filled;
  const slippageDollars = attempt.slippage === null ? null : (attempt.slippage * attempt.filled) / 100;
  const maxAtPrice = Math.max(1, ...attempt.fills.map((fill) => fill.market + fill.limit));
  const otherScenario: Scenario = attempt.scenario === "quiet" ? "news" : "quiet";

  const slippage = attempt.slippage ?? 0;
  const insight =
    attempt.filled === 0
      ? { tone: "amber" as const, title: "Nothing filled.", body: "A limit far below the market protects your price, but you can’t profit from contracts you never bought." }
      : attempt.scenario === "news" && slippage > 5
        ? {
            tone: "red" as const,
            title: "The news repriced the market before you finished.",
            body: `Sellers moved from 60¢ to the mid-70s, and the thin book added slippage on top. ${
              unfilled > 0 ? `You still left ${unfilled} unbought. ` : ""
            }When information moves fast, waiting for a cheap fill can be the most expensive choice.`,
          }
        : attempt.scenario === "news" && attempt.filled >= MISSION_SIZE && slippage <= 2
          ? { tone: "green" as const, title: "You bought before liquidity vanished.", body: "Executing early cost a little slippage, but the same order after the news cost roughly 14¢ more per contract. Speed has value when information is moving." }
          : unfilled > 0
            ? { tone: "amber" as const, title: `${unfilled} ${unfilled === 1 ? "contract" : "contracts"} never filled.`, body: "Your limit protected the price, but waiting has a cost: the market can move away and leave you short of your goal." }
            : slippage > 0.75
              ? { tone: "amber" as const, title: "You paid for speed.", body: "A market order guarantees execution, not price. Each contract beyond the best offer cost a little more as your order consumed liquidity." }
              : slippage < -0.005
                ? { tone: "green" as const, title: "You beat the displayed price.", body: "Patience paid: resting bids let sellers come to you instead of you paying their asking price." }
                : { tone: "blue" as const, title: "Efficient execution.", body: "You completed the mission close to the displayed price. Compare it against a different strategy to see the trade-offs." };

  const blocked = complete ? undefined : !usedLimitEver ? "Replay and use a limit order to finish" : "Replay and use a market order to finish";

  return (
    <>
      <StepHeader {...header} title="Execution report" lead={`${SCENARIOS[attempt.scenario].name} · Attempt ${attempt.id}`} />

      <div className={styles.reportGrid}>
        <Stat label="Contracts bought" value={`${attempt.filled}/${MISSION_SIZE}`} tone={attempt.filled >= MISSION_SIZE ? "green" : "amber"} sub={attempt.filled >= MISSION_SIZE ? "Mission complete" : "Mission incomplete"} />
        <Stat label="Average price" value={attempt.average === null ? "—" : formatCents(attempt.average, 2)} sub={`Shown at the start: ${DISPLAYED_PRICE}¢`} />
        <Stat label="Total cost" value={formatUsd(attempt.cost)} sub={`${attempt.filled} × average price`} />
        <Stat
          label="Slippage"
          value={attempt.slippage === null ? "—" : formatSignedCents(attempt.slippage, 2)}
          tone={attempt.slippage === null ? undefined : attempt.slippage > 0.005 ? "red" : "green"}
          sub={slippageDollars === null ? "No fills" : `${formatUsd(slippageDollars, { sign: true })} vs paying ${DISPLAYED_PRICE}¢`}
        />
        <Stat label="Unfilled" value={String(unfilled)} tone={unfilled > 0 ? "amber" : "green"} sub={unfilled > 0 ? "The cost of waiting" : "None left behind"} />
        <Stat label="Strategy" value={strategyOf(attempt)} />
      </div>

      {attempt.fills.length > 0 ? (
        <section className={styles.fillChart} aria-label="Contracts bought at each price">
          <p className={styles.sectionLabel}>Where your contracts filled</p>
          {attempt.fills.map((fill) => (
            <div key={fill.price} className={styles.fillRow}>
              <span className={styles.fillPrice}>{fill.price}¢</span>
              <div className={styles.fillTrack}>
                {fill.market > 0 ? <span data-kind="market" style={{ width: `${(fill.market / maxAtPrice) * 100}%` }} /> : null}
                {fill.limit > 0 ? <span data-kind="limit" style={{ width: `${(fill.limit / maxAtPrice) * 100}%` }} /> : null}
              </div>
              <span className={styles.fillQty}>{fill.market + fill.limit}</span>
            </div>
          ))}
          <div className={styles.fillLegend}>
            <span data-kind="market">Market order</span>
            <span data-kind="limit">Limit order</span>
          </div>
        </section>
      ) : null}

      <Note tone={insight.tone} title={insight.title}>
        <p>{insight.body}</p>
      </Note>

      {attempts.length > 1 ? (
        <table className={styles.attemptTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>Market</th>
              <th>Strategy</th>
              <th>Bought</th>
              <th>Avg</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((entry) => (
              <tr key={entry.id} data-current={entry.id === attempt.id}>
                <td>{entry.id}</td>
                <td>{SCENARIOS[entry.scenario].name}</td>
                <td>{strategyOf(entry)}</td>
                <td>{entry.filled}</td>
                <td>{entry.average === null ? "—" : formatCents(entry.average, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <SectionLabel>To finish this lesson</SectionLabel>
      <div className={styles.checklist}>
        <span data-done={usedMarketEver}>
          <CheckIcon size={14} /> Used a market order
        </span>
        <span data-done={usedLimitEver}>
          <CheckIcon size={14} /> Used a limit order
        </span>
        <span data-done="true">
          <CheckIcon size={14} /> Finished a simulation
        </span>
      </div>

      <SectionLabel>Try a different strategy</SectionLabel>
      <div className={styles.replayRow}>
        <SecondaryButton onClick={() => onReplay(attempt.scenario)}>
          <ReplayIcon /> Replay {SCENARIOS[attempt.scenario].name.toLowerCase()}
        </SecondaryButton>
        <SecondaryButton onClick={() => onReplay(otherScenario)}>
          {otherScenario === "news" ? <BoltIcon /> : <ClockIcon />} Try {SCENARIOS[otherScenario].name.toLowerCase()}
        </SecondaryButton>
      </div>

      <ActionBar blocked={blocked}>
        <Cta onClick={onFinish} disabled={!complete}>
          Finish lesson <ArrowIcon />
        </Cta>
      </ActionBar>
    </>
  );
}
