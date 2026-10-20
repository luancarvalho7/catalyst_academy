"use client";

import { useId, useMemo } from "react";
import type { PricePoint } from "./engine";
import { useElementSize, useSmoothed } from "./hooks";
import styles from "./Practice.module.css";

export type ChartTone = "blue" | "green" | "red" | "amber" | "muted";
/** Horizontal price level: a right-axis tag, plus a dashed guide and left label when `label` is set. */
export type ChartLine = { price: number; tone: ChartTone; tag: string; label?: string };
export type ChartMarker = { x: number; price: number; kind: "buy" | "sell"; label?: string; weight?: number };
export type ChartEvent = { x: number; label: string; tone?: ChartTone };

type PriceChartProps = {
  points: PricePoint[];
  xDomain: [number, number];
  yDomain?: [number, number];
  minSpan?: number;
  lines?: ChartLine[];
  markers?: ChartMarker[];
  events?: ChartEvent[];
  tone?: ChartTone;
  height: string;
  live?: boolean;
  futureLabel?: string;
  label: string;
};

const COLORS: Record<ChartTone, string> = {
  blue: "#3b82ff",
  green: "#1fd36a",
  red: "#ff4655",
  amber: "#ff9a3d",
  muted: "#6f85b3",
};
const PAD = { top: 18, right: 54, bottom: 10, left: 4 };
const TAG_HEIGHT = 17;
const EMPTY_LINES: ChartLine[] = [];
const EMPTY_MARKERS: ChartMarker[] = [];
const EMPTY_EVENTS: ChartEvent[] = [];

function gridStep(span: number): number {
  return [1, 2, 5, 10, 20, 25].find((step) => span / step <= 5) ?? 25;
}

function extentOf(points: PricePoint[], lines: ChartLine[]): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  for (const point of points) {
    low = Math.min(low, point.price);
    high = Math.max(high, point.price);
  }
  for (const line of lines) {
    low = Math.min(low, line.price);
    high = Math.max(high, line.price);
  }
  return Number.isFinite(low) ? [low, high] : [40, 60];
}

function autoDomain([low, high]: [number, number], minSpan: number): [number, number] {
  const pad = Math.max(1.5, (high - low) * 0.14);
  low -= pad;
  high += pad;
  if (high - low < minSpan) {
    const middle = (high + low) / 2;
    low = middle - minSpan / 2;
    high = middle + minSpan / 2;
  }
  if (low < 0) {
    high -= low;
    low = 0;
  }
  if (high > 100) {
    low -= high - 100;
    high = 100;
  }
  return [Math.max(0, low), Math.min(100, high)];
}

type Tag = { y: number; text: string; color: string; solid: boolean };

/** Pushes overlapping right-axis tags apart; O(n log n) for n tags. */
function separateTags(tags: Tag[], top: number, bottom: number): Tag[] {
  const sorted = [...tags].sort((a, b) => a.y - b.y);
  for (let index = 1; index < sorted.length; index += 1) {
    const minimum = sorted[index - 1].y + TAG_HEIGHT + 2;
    if (sorted[index].y < minimum) sorted[index] = { ...sorted[index], y: minimum };
  }
  const overflow = sorted.length ? sorted[sorted.length - 1].y - bottom : 0;
  return sorted.map((tag) => ({ ...tag, y: Math.max(top, tag.y - Math.max(0, overflow)) }));
}

export function PriceChart({
  points,
  xDomain,
  yDomain,
  minSpan = 10,
  lines = EMPTY_LINES,
  markers = EMPTY_MARKERS,
  events = EMPTY_EVENTS,
  tone = "blue",
  height,
  live = false,
  futureLabel,
  label,
}: PriceChartProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const svgId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const extent = useMemo(() => extentOf(points, lines), [points, lines]);
  const [targetLow, targetHigh] = useMemo(() => yDomain ?? autoDomain(extent, minSpan), [yDomain, extent, minSpan]);
  const easedLow = useSmoothed(targetLow, 150);
  const easedHigh = useSmoothed(targetHigh, 150);
  // The eased domain may trail the target, but it is never allowed to cut off a plotted price.
  const low = Math.max(0, Math.min(Number.isFinite(easedLow) ? easedLow : targetLow, extent[0] - 1));
  const high = Math.min(100, Math.max(Number.isFinite(easedHigh) ? easedHigh : targetHigh, extent[1] + 1));
  const color = COLORS[tone];
  const { width, height: boxHeight } = size;

  const geometry = useMemo(() => {
    if (width === 0 || boxHeight === 0 || points.length === 0) return null;
    const plotRight = width - PAD.right;
    const plotBottom = boxHeight - PAD.bottom;
    const [x0, x1] = xDomain;
    const span = Math.max(high - low, 0.0001);
    const sx = (x: number) => PAD.left + ((x - x0) / (x1 - x0)) * (plotRight - PAD.left);
    const sy = (price: number) => PAD.top + ((high - price) / span) * (plotBottom - PAD.top);

    const line = points.map((point, index) => `${index ? "L" : "M"}${sx(point.x).toFixed(1)} ${sy(point.price).toFixed(1)}`).join("");
    const first = points[0];
    const last = points[points.length - 1];
    const area = `${line}L${sx(last.x).toFixed(1)} ${plotBottom}L${sx(first.x).toFixed(1)} ${plotBottom}Z`;

    const step = gridStep(span);
    const grid: number[] = [];
    for (let price = Math.ceil(low / step) * step; price <= high + 1e-6; price += step) grid.push(price);

    const tags = separateTags(
      [
        ...lines.map((entry) => ({ y: sy(entry.price), text: entry.tag, color: COLORS[entry.tone], solid: false })),
        { y: sy(last.price), text: `${Math.round(last.price)}¢`, color, solid: true },
      ],
      PAD.top - 6,
      plotBottom - TAG_HEIGHT / 2,
    );

    return { plotRight, plotBottom, sx, sy, line, area, grid, tags, last };
  }, [width, boxHeight, points, lines, xDomain, low, high, color]);

  return (
    <div className={styles.chart} style={{ height }} ref={ref} role="img" aria-label={label}>
      {geometry ? (
        <svg width={width} height={boxHeight} viewBox={`0 0 ${width} ${boxHeight}`} aria-hidden="true">
          <defs>
            <linearGradient id={`${svgId}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.3" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <pattern id={`${svgId}-future`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(110, 150, 230, 0.09)" strokeWidth="3" />
            </pattern>
          </defs>

          {futureLabel && geometry.sx(geometry.last.x) < geometry.plotRight - 24 ? (
            <g>
              <rect
                x={geometry.sx(geometry.last.x)}
                y={PAD.top - 8}
                width={geometry.plotRight - geometry.sx(geometry.last.x)}
                height={geometry.plotBottom - PAD.top + 8}
                fill={`url(#${svgId}-future)`}
              />
              <text
                className={styles.chartFuture}
                x={(geometry.sx(geometry.last.x) + geometry.plotRight) / 2}
                y={(PAD.top + geometry.plotBottom) / 2}
                textAnchor="middle"
              >
                {futureLabel}
              </text>
            </g>
          ) : null}

          {geometry.grid.map((price) => (
            <g key={price}>
              <line x1={PAD.left} x2={geometry.plotRight} y1={geometry.sy(price)} y2={geometry.sy(price)} className={styles.chartGrid} />
              <text x={width - 6} y={geometry.sy(price) + 3.5} textAnchor="end" className={styles.chartAxis}>
                {price}¢
              </text>
            </g>
          ))}

          {events.map((event) => {
            const x = geometry.sx(event.x);
            const eventColor = COLORS[event.tone ?? "amber"];
            const pillWidth = event.label.length * 6.1 + 14;
            const pillX = Math.min(Math.max(x - pillWidth / 2, PAD.left), geometry.plotRight - pillWidth);
            return (
              <g key={`${event.x}-${event.label}`} className={styles.chartEvent}>
                <line x1={x} x2={x} y1={PAD.top - 2} y2={geometry.plotBottom} stroke={eventColor} strokeDasharray="3 4" strokeOpacity="0.7" />
                <rect x={pillX} y={1} width={pillWidth} height={15} rx={7.5} fill={eventColor} fillOpacity="0.16" stroke={eventColor} strokeOpacity="0.55" />
                <text x={pillX + pillWidth / 2} y={11.5} textAnchor="middle" fill={eventColor} className={styles.chartEventText}>
                  {event.label}
                </text>
              </g>
            );
          })}

          {lines.map((entry) =>
            entry.label ? (
              <g key={`${entry.tag}-${entry.price}`}>
                <line
                  x1={PAD.left}
                  x2={geometry.plotRight}
                  y1={geometry.sy(entry.price)}
                  y2={geometry.sy(entry.price)}
                  stroke={COLORS[entry.tone]}
                  strokeDasharray="5 5"
                  strokeWidth="1.4"
                />
                <text x={geometry.plotRight - 6} y={geometry.sy(entry.price) - 5} textAnchor="end" fill={COLORS[entry.tone]} className={styles.chartLineLabel}>
                  {entry.label}
                </text>
              </g>
            ) : null,
          )}

          <path d={geometry.area} fill={`url(#${svgId}-area)`} />
          <path d={geometry.line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" className={styles.chartLine} />

          {markers.map((marker, index) => {
            const radius = 4 + Math.min(6, Math.sqrt(marker.weight ?? 1) * 0.55);
            const markerColor = marker.kind === "buy" ? COLORS.green : COLORS.amber;
            const cx = geometry.sx(marker.x);
            const cy = geometry.sy(marker.price);
            return (
              <g key={`${marker.x}-${marker.price}-${index}`} className={styles.chartMarker}>
                <circle cx={cx} cy={cy} r={radius} fill={markerColor} stroke="#030a15" strokeWidth="2" />
                {marker.label ? (
                  <text
                    x={Math.min(Math.max(cx, PAD.left + 30), geometry.plotRight - 30)}
                    y={marker.kind === "buy" ? cy + radius + 12 : cy - radius - 6}
                    textAnchor="middle"
                    fill={markerColor}
                    className={styles.chartMarkerText}
                  >
                    {marker.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {live ? (
            <g>
              <circle cx={geometry.sx(geometry.last.x)} cy={geometry.sy(geometry.last.price)} r="9" fill={color} className={styles.chartPulse} />
              <circle cx={geometry.sx(geometry.last.x)} cy={geometry.sy(geometry.last.price)} r="4" fill={color} stroke="#030a15" strokeWidth="1.5" />
            </g>
          ) : null}

          {geometry.tags.map((tag) => (
            <g key={`${tag.text}-${tag.color}`}>
              <rect
                x={geometry.plotRight + 4}
                y={tag.y - TAG_HEIGHT / 2}
                width={PAD.right - 6}
                height={TAG_HEIGHT}
                rx={4}
                fill={tag.solid ? tag.color : "#06101f"}
                stroke={tag.color}
                strokeOpacity={tag.solid ? 1 : 0.75}
              />
              <text
                x={geometry.plotRight + 4 + (PAD.right - 6) / 2}
                y={tag.y + 4}
                textAnchor="middle"
                fill={tag.solid ? "#ffffff" : tag.color}
                className={styles.chartTag}
              >
                {tag.text}
              </text>
            </g>
          ))}
        </svg>
      ) : null}
    </div>
  );
}
