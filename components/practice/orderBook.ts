/*
 * Price-time-priority order book for the Buy the Spread simulator.
 * The student only buys YES; every other participant is synthetic flow scripted per scenario and tick.
 * Flow is seeded by (scenario, tick) alone, so replays see identical sellers and buyers — only the
 * student's own consumption of liquidity changes the outcome. All operations are pure: O(levels) per call.
 */

import { clamp, createRng, randomInt, type PricePoint } from "./engine";

export type Scenario = "quiet" | "news";

export const MISSION_SIZE = 100;
export const DISPLAYED_PRICE = 60;
export const TOTAL_TICKS = 24;
export const TICKS_PER_WAIT = 3;
export const SECONDS_PER_TICK = 5;
export const HISTORY_SPAN = 14;
export const NEWS_TICK = 4;
export const NEWS_HEADLINE = "Bills QB ruled OUT";

const LADDER_DEPTH = 8;

export type Level = { price: number; size: number };
export type OrderStatus = "pending" | "open" | "filled" | "cancelled" | "expired";
/** `ahead` counts other traders' contracts queued before this order at the same price. */
export type LimitOrder = { id: number; price: number; quantity: number; filled: number; ahead: number; status: OrderStatus };
export type Fill = { orderId: number | null; kind: "market" | "limit"; price: number; quantity: number; x: number };

export type BookState = {
  scenario: Scenario;
  tick: number;
  asks: Level[];
  bids: Level[];
  orders: LimitOrder[];
  fills: Fill[];
  series: PricePoint[];
  lastPrice: number;
  cursor: number;
  nextOrderId: number;
  newsX: number | null;
  placedMarket: boolean;
  placedLimit: boolean;
};

export type TickReport = {
  tick: number;
  myFills: Level[];
  headline: string | null;
  expired: number;
  askBefore: number | null;
  bestAsk: number | null;
  bestBid: number | null;
};

export type DisplayLevel = { price: number; size: number; mine: number };

type Trade = { price: number; quantity: number; orderId: number | null };

type TickPlan = {
  mid: number;
  spread: number;
  depth: number;
  refill: number;
  sells: readonly [number, number];
  buys: readonly [number, number];
  headline: string | null;
};

const OPENING_ASKS: Level[] = [
  { price: 60, size: 20 },
  { price: 61, size: 30 },
  { price: 62, size: 25 },
  { price: 63, size: 40 },
  { price: 64, size: 35 },
  { price: 65, size: 50 },
  { price: 66, size: 45 },
  { price: 67, size: 60 },
];

const OPENING_BIDS: Level[] = [
  { price: 59, size: 25 },
  { price: 58, size: 40 },
  { price: 57, size: 30 },
  { price: 56, size: 45 },
  { price: 55, size: 50 },
  { price: 54, size: 40 },
  { price: 53, size: 60 },
  { price: 52, size: 55 },
];

/* Quiet: a slow dip that rewards patient bids, then a drift up that punishes waiting too long. */
const QUIET_MID = [[0, 59.5], [3, 59.5], [6, 59], [8, 58.6], [12, 58.6], [14, 59.2], [17, 59.8], [20, 60.6], [24, 61.6]] as const;
/* News: fair value gaps ~10¢ higher at NEWS_TICK, then settles while the spread slowly narrows. */
const NEWS_MID = [[0, 69], [2, 70], [6, 70.5], [20, 71.5]] as const;

function interpolate(keys: ReadonlyArray<readonly [number, number]>, t: number): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let index = 1; index < keys.length; index += 1) {
    const [t1, v1] = keys[index];
    if (t <= t1) {
      const [t0, v0] = keys[index - 1];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return keys[keys.length - 1][1];
}

function planFor(scenario: Scenario, tick: number): TickPlan {
  if (scenario === "quiet" || tick < NEWS_TICK) {
    const dipping = tick >= 6 && tick <= 11;
    return {
      mid: interpolate(QUIET_MID, tick),
      spread: 1,
      depth: 1,
      refill: 0.55,
      sells: dipping ? [6, 16] : [3, 14],
      buys: dipping ? [0, 8] : [2, 16],
      headline: null,
    };
  }
  const since = tick - NEWS_TICK;
  return {
    mid: interpolate(NEWS_MID, since),
    spread: since === 0 ? 6 : since <= 2 ? 5 : since <= 5 ? 3 : 2,
    depth: since === 0 ? 0.55 : since <= 3 ? 0.7 : 0.9,
    refill: since <= 2 ? 0.35 : 0.5,
    sells: [2, 12],
    buys: since <= 2 ? [14, 34] : [4, 18],
    headline: since === 0 ? NEWS_HEADLINE : null,
  };
}

const roundLot = (value: number) => Math.max(5, Math.round(value / 5) * 5);
const remainingOf = (order: LimitOrder) => order.quantity - order.filled;
const targetSize = (level: number, depth: number, rng: () => number) => roundLot((18 + 9 * level) * depth * (0.8 + 0.4 * rng()));

function cloneBook(state: BookState): BookState {
  return {
    ...state,
    asks: state.asks.map((level) => ({ ...level })),
    bids: state.bids.map((level) => ({ ...level })),
    orders: state.orders.map((order) => ({ ...order })),
    fills: [...state.fills],
    series: [...state.series],
  };
}

function insertLevel(levels: Level[], level: Level, ascending: boolean) {
  const index = levels.findIndex((existing) => (ascending ? existing.price > level.price : existing.price < level.price));
  if (index === -1) levels.push(level);
  else levels.splice(index, 0, level);
}

function fillOrder(order: LimitOrder, quantity: number) {
  order.filled += quantity;
  if (order.filled >= order.quantity) order.status = "filled";
}

export function openOrders(state: BookState): LimitOrder[] {
  return state.orders.filter((order) => order.status === "open");
}

export function bestBidOf(state: BookState): number | null {
  const prices = [state.bids[0]?.price ?? 0, ...openOrders(state).map((order) => order.price)];
  const best = Math.max(...prices);
  return best > 0 ? best : null;
}

export function createBook(scenario: Scenario): BookState {
  const rng = createRng(401);
  const series: PricePoint[] = [];
  for (let x = 0; x <= HISTORY_SPAN; x += 1) {
    const roll = rng();
    const price = x === HISTORY_SPAN ? 60 : roll < 0.55 ? 60 : roll < 0.9 ? 59 : roll < 0.97 ? 61 : 58;
    series.push({ x, price });
  }
  return {
    scenario,
    tick: 0,
    asks: OPENING_ASKS.map((level) => ({ ...level })),
    bids: OPENING_BIDS.map((level) => ({ ...level })),
    orders: [],
    fills: [],
    series,
    lastPrice: 60,
    cursor: HISTORY_SPAN,
    nextOrderId: 1,
    newsX: null,
    placedMarket: false,
    placedLimit: false,
  };
}

/* ---------- student actions ---------- */

export function markMarketOrder(state: BookState): BookState {
  return { ...state, placedMarket: true };
}

/** Consumes the single best ask (≤ limitPrice) — one call per level so the UI can animate the book being walked. */
export function takeBestAsk(
  state: BookState,
  maxQuantity: number,
  limitPrice: number,
  kind: Fill["kind"],
  orderId: number | null,
): { state: BookState; taken: Level | null } {
  const best = state.asks[0];
  if (!best || best.price > limitPrice || maxQuantity <= 0) return { state, taken: null };

  const draft = cloneBook(state);
  const level = draft.asks[0];
  const quantity = Math.min(level.size, maxQuantity);
  level.size -= quantity;
  if (level.size === 0) draft.asks.shift();

  const ceiling = HISTORY_SPAN + draft.tick + 0.85;
  const x = draft.cursor + (draft.cursor + 0.14 <= ceiling ? 0.14 : 0.02);
  draft.cursor = x;
  draft.series.push({ x, price: level.price });
  draft.lastPrice = level.price;
  draft.fills.push({ orderId, kind, price: level.price, quantity, x });

  const order = orderId === null ? undefined : draft.orders.find((entry) => entry.id === orderId);
  if (order) order.filled += quantity;
  return { state: draft, taken: { price: level.price, size: quantity } };
}

/** Opens a limit buy. A second order at a price you already bid merges into the first (no asks can sit at or below it). */
export function createLimitOrder(state: BookState, quantity: number, price: number): { state: BookState; orderId: number; merged: boolean } {
  const draft = cloneBook(state);
  draft.placedLimit = true;
  const existing = draft.orders.find((order) => order.status === "open" && order.price === price);
  if (existing) {
    existing.quantity += quantity;
    return { state: draft, orderId: existing.id, merged: true };
  }
  const order: LimitOrder = { id: draft.nextOrderId, price, quantity, filled: 0, ahead: 0, status: "pending" };
  draft.nextOrderId += 1;
  draft.orders.push(order);
  return { state: draft, orderId: order.id, merged: false };
}

/** After the marketable part executes, the remainder joins the back of the queue at its price. */
export function restLimitOrder(state: BookState, orderId: number): BookState {
  const draft = cloneBook(state);
  const order = draft.orders.find((entry) => entry.id === orderId);
  if (!order) return state;
  if (order.filled >= order.quantity) order.status = "filled";
  else {
    order.status = "open";
    order.ahead = draft.bids.find((level) => level.price === order.price)?.size ?? 0;
  }
  return draft;
}

export function cancelOrder(state: BookState, orderId: number): BookState {
  const draft = cloneBook(state);
  const order = draft.orders.find((entry) => entry.id === orderId && entry.status === "open");
  if (order) order.status = "cancelled";
  return draft;
}

export function closeOpenOrders(state: BookState, status: "cancelled" | "expired"): { state: BookState; unfilled: number } {
  const draft = cloneBook(state);
  let unfilled = 0;
  for (const order of openOrders(draft)) {
    unfilled += remainingOf(order);
    order.status = status;
  }
  return { state: draft, unfilled };
}

/* ---------- synthetic market ---------- */

function postAsk(draft: BookState, price: number, size: number, trades: Trade[]) {
  let remaining = size;
  // A seller offering at or below a resting student bid trades with it at the bid's price.
  const crossing = openOrders(draft)
    .filter((order) => order.price >= price)
    .sort((a, b) => b.price - a.price);
  for (const order of crossing) {
    if (remaining <= 0) break;
    const quantity = Math.min(remainingOf(order), remaining);
    fillOrder(order, quantity);
    trades.push({ price: order.price, quantity, orderId: order.id });
    remaining -= quantity;
  }
  if (remaining <= 0) return;
  const level = draft.asks.find((entry) => entry.price === price);
  if (level) level.size += remaining;
  else insertLevel(draft.asks, { price, size: remaining }, true);
}

function refreshAsks(draft: BookState, bestAsk: number, plan: TickPlan, rng: () => number, trades: Trade[]) {
  draft.asks = draft.asks.filter((level) => level.price >= bestAsk && level.price < bestAsk + LADDER_DEPTH + 2);
  for (let index = 0; index < LADDER_DEPTH; index += 1) {
    const price = bestAsk + index;
    if (price > 99) break;
    const target = targetSize(index, plan.depth, rng);
    const existing = draft.asks.find((level) => level.price === price);
    const current = existing?.size ?? 0;
    if (existing && current >= target) {
      if (current > target * 1.6) existing.size = roundLot(target * 1.3);
      continue;
    }
    postAsk(draft, price, existing ? roundLot((target - current) * plan.refill) : roundLot(target * 0.7), trades);
  }
}

function refreshBids(draft: BookState, bestBid: number, plan: TickPlan, rng: () => number) {
  draft.bids = draft.bids.filter((level) => level.price <= bestBid && level.price > bestBid - LADDER_DEPTH - 2);
  for (let index = 0; index < LADDER_DEPTH; index += 1) {
    const price = bestBid - index;
    if (price < 1) break;
    const target = targetSize(index, plan.depth, rng);
    const existing = draft.bids.find((level) => level.price === price);
    const current = existing?.size ?? 0;
    if (existing && current >= target) {
      if (current > target * 1.6) existing.size = roundLot(target * 1.3);
      continue;
    }
    const added = existing ? roundLot((target - current) * plan.refill) : roundLot(target * 0.7);
    if (existing) existing.size += added;
    else insertLevel(draft.bids, { price, size: added }, false);
  }
  // Cancellations leave from the back of the queue; a vanished level leaves nobody ahead of the student.
  for (const order of openOrders(draft)) {
    const others = draft.bids.find((level) => level.price === order.price)?.size ?? 0;
    order.ahead = Math.min(order.ahead, others);
  }
}

function othersBuy(draft: BookState, quantity: number, trades: Trade[]) {
  let remaining = quantity;
  while (remaining > 0 && draft.asks.length) {
    const level = draft.asks[0];
    const take = Math.min(level.size, remaining);
    level.size -= take;
    remaining -= take;
    trades.push({ price: level.price, quantity: take, orderId: null });
    if (level.size === 0) draft.asks.shift();
  }
}

/** Market sells hit the highest bid first; at the student's price the queue is others-ahead → student → others-behind. */
function othersSell(draft: BookState, quantity: number, trades: Trade[]) {
  let remaining = quantity;
  while (remaining > 0) {
    const otherLevel = draft.bids[0];
    const myBest = openOrders(draft).sort((a, b) => b.price - a.price)[0];
    const price = Math.max(otherLevel?.price ?? 0, myBest?.price ?? 0);
    if (price <= 0) break;
    const level = otherLevel?.price === price ? otherLevel : undefined;
    const order = myBest?.price === price ? myBest : undefined;

    if (order) {
      if (!level) order.ahead = 0;
      if (level && order.ahead > 0) {
        const take = Math.min(order.ahead, level.size, remaining);
        level.size -= take;
        order.ahead -= take;
        remaining -= take;
        trades.push({ price, quantity: take, orderId: null });
      }
      if (remaining > 0 && order.ahead === 0) {
        const take = Math.min(remainingOf(order), remaining);
        fillOrder(order, take);
        remaining -= take;
        trades.push({ price, quantity: take, orderId: order.id });
      }
    }
    if (level && remaining > 0 && (!order || order.status !== "open")) {
      const take = Math.min(level.size, remaining);
      level.size -= take;
      remaining -= take;
      if (take > 0) trades.push({ price, quantity: take, orderId: null });
    }
    if (level && level.size === 0) draft.bids.shift();
  }
}

export function advanceTick(state: BookState): { state: BookState; report: TickReport } {
  const draft = cloneBook(state);
  const askBefore = draft.asks[0]?.price ?? null;
  draft.tick += 1;
  const plan = planFor(draft.scenario, draft.tick);
  const diverged = draft.scenario === "news" && draft.tick >= NEWS_TICK;
  const rng = createRng(draft.tick * 7919 + (diverged ? 29 : 13));
  const bestAsk = clamp(Math.round(plan.mid + plan.spread / 2), 2, 99);
  const bestBid = clamp(bestAsk - plan.spread, 1, bestAsk - 1);
  const trades: Trade[] = [];

  refreshAsks(draft, bestAsk, plan, rng, trades);
  refreshBids(draft, bestBid, plan, rng);
  const sellQuantity = randomInt(rng, plan.sells);
  const buyQuantity = randomInt(rng, plan.buys);
  if (rng() < 0.5) {
    othersBuy(draft, buyQuantity, trades);
    othersSell(draft, sellQuantity, trades);
  } else {
    othersSell(draft, sellQuantity, trades);
    othersBuy(draft, buyQuantity, trades);
  }

  const startX = draft.cursor;
  const endX = Math.max(HISTORY_SPAN + draft.tick, startX + 0.3);
  if (plan.headline) draft.newsX = startX + 0.05;
  const myFills: Level[] = [];
  trades.forEach((trade, index) => {
    const x = startX + ((index + 1) / (trades.length + 1)) * (endX - startX);
    draft.series.push({ x, price: trade.price });
    draft.lastPrice = trade.price;
    if (trade.orderId !== null) {
      draft.fills.push({ orderId: trade.orderId, kind: "limit", price: trade.price, quantity: trade.quantity, x });
      const existing = myFills.find((level) => level.price === trade.price);
      if (existing) existing.size += trade.quantity;
      else myFills.push({ price: trade.price, size: trade.quantity });
    }
  });
  draft.series.push({ x: endX, price: draft.lastPrice });
  draft.cursor = endX;

  let expired = 0;
  let finalState = draft;
  if (draft.tick >= TOTAL_TICKS) {
    const closed = closeOpenOrders(draft, "expired");
    finalState = closed.state;
    expired = closed.unfilled;
  }

  return {
    state: finalState,
    report: {
      tick: finalState.tick,
      myFills,
      headline: plan.headline,
      expired,
      askBefore,
      bestAsk: finalState.asks[0]?.price ?? null,
      bestBid: bestBidOf(finalState),
    },
  };
}

/* ---------- read models ---------- */

export function previewBuy(state: BookState, quantity: number, limitPrice: number): { levels: Level[]; filled: number; average: number | null } {
  const levels: Level[] = [];
  let remaining = quantity;
  for (const level of state.asks) {
    if (remaining <= 0 || level.price > limitPrice) break;
    const take = Math.min(level.size, remaining);
    levels.push({ price: level.price, size: take });
    remaining -= take;
  }
  const filled = quantity - remaining;
  const average = filled ? levels.reduce((sum, level) => sum + level.price * level.size, 0) / filled : null;
  return { levels, filled, average };
}

export function summarize(state: BookState) {
  const filled = state.fills.reduce((sum, fill) => sum + fill.quantity, 0);
  const spentCents = state.fills.reduce((sum, fill) => sum + fill.price * fill.quantity, 0);
  const reserved = openOrders(state).reduce((sum, order) => sum + remainingOf(order), 0);
  const average = filled ? spentCents / filled : null;
  return {
    filled,
    reserved,
    cost: spentCents / 100,
    average,
    slippage: average === null ? null : average - DISPLAYED_PRICE,
  };
}

export function displayBook(state: BookState, rows: number): { asks: DisplayLevel[]; bids: DisplayLevel[]; hiddenMine: LimitOrder[] } {
  const asks = state.asks.slice(0, rows).map((level) => ({ ...level, mine: 0 }));
  const merged = new Map<number, DisplayLevel>();
  for (const level of state.bids) merged.set(level.price, { price: level.price, size: level.size, mine: 0 });
  for (const order of openOrders(state)) {
    const entry = merged.get(order.price) ?? { price: order.price, size: 0, mine: 0 };
    entry.size += remainingOf(order);
    entry.mine += remainingOf(order);
    merged.set(order.price, entry);
  }
  const bids = [...merged.values()].sort((a, b) => b.price - a.price).slice(0, rows);
  const floor = bids[bids.length - 1]?.price ?? 0;
  return { asks, bids, hiddenMine: openOrders(state).filter((order) => order.price < floor) };
}

export function aggregateFills(fills: Fill[]): { price: number; market: number; limit: number }[] {
  const byPrice = new Map<number, { price: number; market: number; limit: number }>();
  for (const fill of fills) {
    const entry = byPrice.get(fill.price) ?? { price: fill.price, market: 0, limit: 0 };
    entry[fill.kind] += fill.quantity;
    byPrice.set(fill.price, entry);
  }
  return [...byPrice.values()].sort((a, b) => a.price - b.price);
}
