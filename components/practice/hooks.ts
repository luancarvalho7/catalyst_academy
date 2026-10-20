"use client";

import { RefObject, useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** Eases a number toward `target` with a cubic ease-out on requestAnimationFrame; snaps when motion is reduced. */
export function useTweened(target: number, durationMs = 650): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const from = valueRef.current;
    if (reduced || from === target) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    const startedAt = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      valueRef.current = from + (target - from) * eased;
      setValue(valueRef.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return value;
}

/**
 * Exponentially chases a moving target (time constant `tauMs`) on one shared rAF loop. Unlike useTweened,
 * a target that changes every frame never restarts the curve, so fast-moving inputs stay smooth.
 */
export function useSmoothed(target: number, tauMs = 140): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const targetRef = useRef(target);
  const frameRef = useRef(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    targetRef.current = target;
    if (reduced) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    if (frameRef.current) return;
    let last = performance.now();
    const step = (now: number) => {
      // rAF timestamps can precede the performance.now() seed; a negative step would overshoot toward ±∞.
      const elapsed = Math.min(64, Math.max(0, now - last));
      last = now;
      const goal = targetRef.current;
      const candidate = valueRef.current + (goal - valueRef.current) * (1 - Math.exp(-elapsed / tauMs));
      const next = Number.isFinite(candidate) ? candidate : goal;
      const settled = Math.abs(goal - next) < 0.01;
      valueRef.current = settled ? goal : next;
      setValue(valueRef.current);
      frameRef.current = settled ? 0 : requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [target, tauMs, reduced]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    },
    [],
  );

  return value;
}

/**
 * Advances an integer frame toward `until`, one frame per `intervalMs`. Raising `until` resumes playback;
 * reduced motion jumps straight to `until`.
 */
export function useFrameClock(until: number, intervalMs: number, initial = 0): number {
  const [frame, setFrame] = useState(initial);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (frame >= until) return;
    if (reduced) {
      setFrame(until);
      return;
    }
    const timer = window.setTimeout(() => setFrame((current) => Math.min(until, current + 1)), intervalMs);
    return () => window.clearTimeout(timer);
  }, [frame, until, intervalMs, reduced]);

  return frame;
}

/** Tracks an element's content box via ResizeObserver; reports 0×0 until the first measurement. */
export function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
