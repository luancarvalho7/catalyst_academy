"use client";

/*
 * Visual grammar shared by every practice screen — one look per role so students never guess:
 *   YourMove   blue line with a pointer icon        → what to do now
 *   Note       flat text, grey left bar, "i" icon   → information only, never clickable
 *   ChoiceCard bordered card with a radio circle    → pick one option
 *   Cta / ActionButton / SecondaryButton            → solid or outlined pills that do something
 *   ActionBar  sticky at the bottom of the screen   → the next step is always on screen
 */

import Image from "next/image";
import { CSSProperties, ReactNode, RefObject, useEffect, useId, useRef, useState } from "react";
import flow from "../LessonFlow.module.css";
import styles from "./Practice.module.css";

function Svg({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const CheckIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}>
    <path d="m5 12.5 4.5 4.5L19 7.5" strokeWidth="2.6" />
  </Svg>
);

export const CrossIcon = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}>
    <path d="m7 7 10 10M17 7 7 17" strokeWidth="2.6" />
  </Svg>
);

export const ArrowIcon = () => (
  <Svg size={18}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </Svg>
);

export const ArrowUpIcon = () => (
  <Svg size={16}>
    <path d="M12 19V5m-6 6 6-6 6 6" strokeWidth="2.2" />
  </Svg>
);

export const ArrowDownIcon = () => (
  <Svg size={16}>
    <path d="M12 5v14m-6-6 6 6 6-6" strokeWidth="2.2" />
  </Svg>
);

export const LockIcon = () => (
  <Svg size={16}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Svg>
);

export const BoltIcon = () => (
  <Svg size={18}>
    <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" fill="currentColor" stroke="none" />
  </Svg>
);

export const InfoIcon = () => (
  <Svg size={18}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.8v.01" strokeWidth="2.2" />
  </Svg>
);

export const ClockIcon = () => (
  <Svg size={16}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const ShieldIcon = () => (
  <Svg size={20}>
    <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-2.5Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
);

export const ReplayIcon = () => (
  <Svg size={17}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
  </Svg>
);

export const PointerIcon = () => (
  <Svg size={18}>
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0v1m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.8-2.4L4.4 15.5a1.6 1.6 0 0 1 2.4-2.1L9 15.5" />
  </Svg>
);

export const PauseIcon = () => (
  <Svg size={18}>
    <path d="M9 6v12M15 6v12" strokeWidth="2.6" />
  </Svg>
);

export const CashOutIcon = () => (
  <Svg size={18}>
    <rect x="3" y="7" width="18" height="11" rx="2.5" />
    <circle cx="12" cy="12.5" r="2.4" />
    <path d="M12 3v3M10.5 4.5 12 3l1.5 1.5" />
  </Svg>
);

export const PlusIcon = () => (
  <Svg size={18}>
    <path d="M12 5v14M5 12h14" strokeWidth="2.4" />
  </Svg>
);

export const MinusIcon = () => (
  <Svg size={18}>
    <path d="M5 12h14" strokeWidth="2.4" />
  </Svg>
);

export const ChevronDownIcon = () => (
  <Svg size={16}>
    <path d="m6 9 6 6 6-6" strokeWidth="2.4" />
  </Svg>
);

export const SkipIcon = () => (
  <Svg size={18}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 15.5 7-7" />
  </Svg>
);

/* ---------- structure ---------- */

export function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div className={flow.progress} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1}>
      <span style={{ width: `${((index + 1) / total) * 100}%` }} />
    </div>
  );
}

export function StepHeader({ kicker, step, total, title, lead, aside }: { kicker: string; step: number; total: number; title: ReactNode; lead?: ReactNode; aside?: ReactNode }) {
  return (
    <header className={styles.stepHeader}>
      <div className={styles.stepHeaderTop}>
        <p className={styles.stepKicker}>
          {kicker}
          <span className={styles.stepCount}>
            Step {step} of {total}
          </span>
        </p>
        {aside}
      </div>
      <h1 className={styles.simTitle}>{title}</h1>
      {lead ? <p className={styles.simLead}>{lead}</p> : null}
    </header>
  );
}

/** The one instruction on screen. `onShow` adds a button that scrolls to whatever the instruction points at. */
export function YourMove({ children, onShow, showLabel = "Show me" }: { children: ReactNode; onShow?: () => void; showLabel?: string }) {
  return (
    <div className={styles.yourMove}>
      <span className={styles.yourMoveIcon}>
        <PointerIcon />
      </span>
      <p>
        <b>Your move:</b> {children}
      </p>
      {onShow ? (
        <button type="button" className={styles.showMe} onClick={onShow}>
          {showLabel} <ArrowDownIcon />
        </button>
      ) : null}
    </div>
  );
}

export function Note({ children, title, tone = "neutral", icon }: { children: ReactNode; title?: ReactNode; tone?: "neutral" | "green" | "red" | "amber" | "blue"; icon?: ReactNode }) {
  return (
    <div className={styles.note} data-tone={tone}>
      <span className={styles.noteIcon}>{icon ?? <InfoIcon />}</span>
      <div>
        {title ? <strong>{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}

/** Kept for call sites that want a stronger result banner; renders as information, not as a control. */
export function Callout({ tone, icon, title, children }: { tone: "green" | "red" | "blue" | "amber"; icon?: ReactNode; title?: ReactNode; children: ReactNode }) {
  return (
    <Note tone={tone} icon={icon} title={title}>
      {children}
    </Note>
  );
}

/** Collapsed-by-default section: a full-width toggle row that reads as a button, with the content below. */
export function Disclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <div className={styles.disclosure} data-open={open}>
      <button type="button" className={styles.disclosureToggle} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((current) => !current)}>
        <span className={styles.disclosureTitle}>{title}</span>
        <span className={styles.disclosureHint}>
          {open ? "Hide" : "Show"} <ChevronDownIcon />
        </span>
      </button>
      {open ? (
        <div id={bodyId} className={styles.disclosureBody}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SectionLabel({ number, children, hint }: { number?: number; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <p className={styles.sectionLabel}>
        {number !== undefined ? <b className={styles.stepDot}>{number}</b> : null}
        {children}
      </p>
      {hint ? <span className={styles.sectionHint}>{hint}</span> : null}
    </div>
  );
}

/* ---------- controls ---------- */

export function Cta({ children, onClick, disabled = false, tone = "blue" }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "blue" | "green" }) {
  return (
    <button type="button" className={`${flow.cta} ${styles.cta} ${tone === "green" ? styles.ctaGreen : ""}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={styles.secondary} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Ghost({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={styles.textButton} onClick={onClick}>
      {children}
    </button>
  );
}

type Direction = "up" | "down" | "here";

/** Where `target` sits relative to the visible area between the header and the sticky bar; rAF-throttled. */
function useTargetDirection(target: RefObject<HTMLElement | null> | undefined, active: boolean): Direction {
  const [direction, setDirection] = useState<Direction>("down");
  useEffect(() => {
    if (!active || !target) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const element = target.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      setDirection(rect.top > window.innerHeight - 200 ? "down" : rect.bottom < 90 ? "up" : "here");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [active, target]);
  return direction;
}

/**
 * Sticky footer that keeps the next step on screen while the student scrolls. While `blocked`, the bar
 * shows a single "go there" button whose arrow follows the missing control and scrolls to it on tap;
 * without a `target`, it shows the reason above the disabled children instead.
 */
export function ActionBar({ children, blocked, target }: { children: ReactNode; blocked?: ReactNode; target?: RefObject<HTMLElement | null> }) {
  const direction = useTargetDirection(target, Boolean(blocked && target));

  if (blocked && target) {
    return (
      <div className={styles.actionBar}>
        <button type="button" className={styles.goThere} onClick={() => scrollToRef(target, "center")}>
          {direction === "up" ? <ArrowUpIcon /> : direction === "down" ? <ArrowDownIcon /> : <PointerIcon />}
          {blocked}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.actionBar}>
      {blocked ? <p className={styles.actionHint}>{blocked}</p> : null}
      {children}
    </div>
  );
}

export function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  badge,
  tone = "blue",
  compact = false,
  disabled = false,
  indicator = "radio",
}: {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  tone?: "blue" | "amber";
  compact?: boolean;
  disabled?: boolean;
  /** "check" draws a square box and announces as a checkbox, for pick-all-that-apply groups. */
  indicator?: "radio" | "check";
}) {
  return (
    <button
      type="button"
      role={indicator === "check" ? "checkbox" : "radio"}
      aria-checked={selected}
      className={`${styles.choice} ${compact ? styles.choiceCompact : ""}`}
      data-selected={selected}
      data-tone={tone}
      data-indicator={indicator}
      onClick={onSelect}
      disabled={disabled}
    >
      {icon ? <span className={styles.choiceIcon}>{icon}</span> : null}
      <span className={styles.choiceText}>
        <strong>
          {title}
          {badge ? <em>{badge}</em> : null}
        </strong>
        {description ? <span>{description}</span> : null}
      </span>
      <span className={styles.radio} aria-hidden="true">
        {selected ? <CheckIcon size={13} /> : null}
      </span>
    </button>
  );
}

export function ChoiceGroup({ label, children, columns = 1, multi = false }: { label: string; children: ReactNode; columns?: 1 | 2 | 3; multi?: boolean }) {
  return (
    <div className={styles.choiceGroup} role={multi ? "group" : "radiogroup"} aria-label={label} data-columns={columns}>
      {children}
    </div>
  );
}

/** Range input flanked by −/+ buttons, with a "drag" cue until the student first touches it. */
export function SliderControl({
  value,
  min,
  max,
  step = 1,
  onChange,
  onDecrement,
  onIncrement,
  label,
  disabled = false,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  label: string;
  disabled?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const touch = () => setTouched(true);

  return (
    <div className={styles.sliderControl} data-disabled={disabled}>
      <div className={styles.sliderRow}>
        <button
          type="button"
          className={styles.sliderStep}
          onClick={() => {
            touch();
            onDecrement();
          }}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
        >
          <MinusIcon />
        </button>
        <input
          className={`${flow.slider} ${styles.slider}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            touch();
            onChange(Number(event.target.value));
          }}
          style={{ "--fill": `${fill}%` } as CSSProperties}
          aria-label={label}
        />
        <button
          type="button"
          className={styles.sliderStep}
          onClick={() => {
            touch();
            onIncrement();
          }}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
        >
          <PlusIcon />
        </button>
      </div>
      {!touched && !disabled ? <p className={styles.dragHint}>Drag the dot, or tap − / +</p> : null}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  disabled = false,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      className={`${flow.slider} ${styles.slider}`}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ "--fill": `${fill}%` } as CSSProperties}
      aria-label={label}
    />
  );
}

/* ---------- information displays ---------- */

export function Scoreboard({
  chiefs,
  bills,
  period,
  clock,
  live = false,
  final = false,
}: {
  chiefs: number;
  bills: number;
  period: string;
  clock: string;
  live?: boolean;
  final?: boolean;
}) {
  return (
    <div className={styles.scoreboard}>
      <div className={styles.team}>
        <Image src="/helmet-chiefs.png" alt="" width={500} height={424} className={styles.teamHelmet} />
        <span className={styles.teamName}>KC</span>
        <strong className={styles.teamScore} key={`kc-${chiefs}`}>
          {chiefs}
        </strong>
      </div>
      <div className={styles.gameClock}>
        {final ? <span className={styles.finalTag}>Final</span> : live ? <span className={styles.liveTag}>Live</span> : <span className={styles.preTag}>Pre-game</span>}
        <span>
          {period}
          {clock ? ` · ${clock}` : ""}
        </span>
      </div>
      <div className={`${styles.team} ${styles.teamAway}`}>
        <strong className={styles.teamScore} key={`buf-${bills}`}>
          {bills}
        </strong>
        <span className={styles.teamName}>BUF</span>
        <Image src="/helmet-bills.png" alt="" width={456} height={424} className={styles.teamHelmet} />
      </div>
    </div>
  );
}

export function Stat({ label, value, tone, sub }: { label: string; value: ReactNode; tone?: "green" | "red" | "blue" | "amber"; sub?: ReactNode }) {
  return (
    <div className={styles.stat} data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

export function NumberedList({ items }: { items: ReactNode[] }) {
  return (
    <ol className={styles.numbered}>
      {items.map((item, index) => (
        <li key={index}>
          <span>{index + 1}</span>
          <p>{item}</p>
        </li>
      ))}
    </ol>
  );
}

/* ---------- behaviour ---------- */

const SMOOTH_SCROLL_BUDGET_MS = 700;

/**
 * Smooth-scrolls to `element`, then jumps there if it is still off screen once the animation should have
 * finished. Some browsers drop smooth scrolls in background or low-power tabs; the next step must still
 * end up in front of the student.
 */
export function revealElement(element: HTMLElement | null, block: ScrollLogicalPosition = "nearest") {
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block });
  window.setTimeout(() => {
    const rect = element.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight - 160) element.scrollIntoView({ behavior: "auto", block });
  }, SMOOTH_SCROLL_BUDGET_MS);
}

export function scrollPageTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.setTimeout(() => {
    if (window.scrollY > 4) window.scrollTo({ top: 0, behavior: "auto" });
  }, SMOOTH_SCROLL_BUDGET_MS);
}

/** Brings an element into view whenever `trigger` becomes truthy (or changes while truthy). */
export function useRevealWhen<T extends HTMLElement>(trigger: unknown): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!trigger) return;
    const timer = window.setTimeout(() => revealElement(ref.current), 120);
    return () => window.clearTimeout(timer);
  }, [trigger]);
  return ref;
}

export function scrollToRef(ref: RefObject<HTMLElement | null>, block: ScrollLogicalPosition = "start") {
  revealElement(ref.current, block);
}
