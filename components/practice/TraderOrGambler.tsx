"use client";

import { useState } from "react";
import flow from "../LessonFlow.module.css";
import styles from "./Practice.module.css";
import { TG_CARDS, tgVerdict, type TgAnswer } from "./assessment";
import { ActionBar, ArrowIcon, Cta, Ghost, ReplayIcon, YourMove } from "./ui";

type LessonProps = { lessonNumber: number; lessonTotal: number; onNextLesson?: () => void; videoId?: string };

/** Lesson 1: the intro video in the middle, a small Trader-or-Gambler banner under it, then six quick calls. */
export function TraderOrGambler({ onNextLesson, videoId }: LessonProps) {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);

  if (started) {
    return (
      <div className={`${flow.flow} ${styles.sim}`}>
        <Game key={round} onReplay={() => setRound((current) => current + 1)} onNextLesson={onNextLesson} />
      </div>
    );
  }

  return (
    <div className={`${styles.sim} ${styles.introStage}`}>
      {videoId ? (
        <div className={styles.introVideo}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="Introduction to Catalyst Academy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : null}
      <section className={styles.tgBanner}>
        <span className={styles.tgBannerFaces} aria-hidden="true">
          {TG_CARDS.slice(0, 3).map((card) => (
            <i key={card.name} style={{ background: card.color }}>
              {card.name[0]}
            </i>
          ))}
        </span>
        <span className={styles.tgBannerText}>
          <strong>Trader or Gambler?</strong>
          <small>{TG_CARDS.length} quick calls</small>
        </span>
        <button type="button" className={styles.tgPlay} onClick={() => setStarted(true)}>
          Play <ArrowIcon />
        </button>
      </section>
    </div>
  );
}

function Game({ onReplay, onNextLesson }: { onReplay: () => void; onNextLesson?: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(TgAnswer | null)[]>(() => TG_CARDS.map(() => null));
  const total = TG_CARDS.length;
  const score = answers.filter((answer, position) => answer === TG_CARDS[position].answer).length;
  const firstAnswerGiven = answers.some((answer) => answer !== null);

  const top = (
    <div className={styles.tgTop}>
      <h1 className={styles.tgTitle}>Trader or Gambler?</h1>
      <div className={styles.tgDots} aria-label={`${answers.filter(Boolean).length} of ${total} answered`}>
        {TG_CARDS.map((card, position) => (
          <i
            key={card.name}
            data-state={answers[position] === null ? (position === index ? "current" : "todo") : answers[position] === card.answer ? "right" : "wrong"}
          />
        ))}
      </div>
    </div>
  );

  if (index >= total) {
    const verdict = tgVerdict(score, total);
    return (
      <>
        {top}
        <div className={styles.tgEnd}>
          <p className={styles.tgScore}>
            {score}
            <small>/{total}</small>
          </p>
          <p className={styles.tgVerdict}>{verdict.title}</p>
          <p className={styles.tgVerdictLine}>{verdict.line}</p>
        </div>
        <ActionBar>
          {onNextLesson ? (
            <Cta onClick={onNextLesson}>
              Next lesson <ArrowIcon />
            </Cta>
          ) : null}
          <Ghost onClick={onReplay}>
            <ReplayIcon /> Play again
          </Ghost>
        </ActionBar>
      </>
    );
  }

  const card = TG_CARDS[index];
  const answer = answers[index];
  const right = answer === card.answer;

  function choose(value: TgAnswer) {
    setAnswers((current) => current.map((entry, position) => (position === index ? value : entry)));
  }

  return (
    <>
      {top}
      {firstAnswerGiven ? null : (
        <YourMove>
          Read the quote. Tap <b>Trader</b> or <b>Gambler</b>.
        </YourMove>
      )}

      <div className={styles.tg}>
        <article className={styles.tgCard} data-result={answer ? (right ? "right" : "wrong") : undefined} key={index}>
          <div className={styles.tgWho}>
            <span className={styles.tgAvatar} style={{ background: card.color }} aria-hidden="true">
              {card.name[0]}
            </span>
            <b>{card.name}</b>
          </div>
          <p className={styles.tgQuote}>“{card.quote}”</p>
          {answer ? (
            <div className={styles.tgResult} aria-live="polite">
              <span className={styles.tgStamp} data-right={right}>
                {right ? "Correct" : "Nope"} · {card.answer === "trader" ? "Trader" : "Gambler"}
              </span>
              <p>{card.reason}</p>
            </div>
          ) : null}
        </article>

        {answer ? null : (
          <div className={styles.tgButtons}>
            <button type="button" className={styles.tgButton} data-kind="gambler" onClick={() => choose("gambler")}>
              Gambler
            </button>
            <button type="button" className={styles.tgButton} data-kind="trader" onClick={() => choose("trader")}>
              Trader
            </button>
          </div>
        )}
      </div>

      {answer ? (
        <ActionBar>
          <Cta onClick={() => setIndex((current) => current + 1)}>
            {index === total - 1 ? "See your score" : "Next card"} <ArrowIcon />
          </Cta>
        </ActionBar>
      ) : null}
    </>
  );
}
