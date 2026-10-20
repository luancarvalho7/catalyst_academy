"use client";

import Image from "next/image";
import Link from "next/link";
import { CSSProperties, FormEvent, ReactNode, useEffect, useState } from "react";
import styles from "./Home.module.css";
import { COURSES, FOUNDATIONS_LESSONS } from "./courses";
import { QUESTIONS, isValidEmail, loadAssessment, profileFor, recordAssessment, toggleMulti, type Answers, type AssessmentRecord, type Lead } from "../practice/assessment";

function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const CheckIcon = () => (
  <Svg size={13}>
    <path d="m5 12.5 4.5 4.5L19 7.5" strokeWidth="3" />
  </Svg>
);
const ArrowRight = () => (
  <Svg>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </Svg>
);

const START_REASON: Record<number, string> = {
  1: "it sets up how prices, practice money and the lessons work",
  2: "it turns prices into probabilities, the base of every edge",
  3: "it shows how one oversized trade ends a Catalyst Challenge",
};

/** New traders start at Lesson 1; everyone else starts where their goal is taught. */
function startLessonFor(answers: Answers): number {
  if (answers.exp?.[0] === "new") return 1;
  const goal = answers.goal?.[0];
  return goal === "edge" ? 2 : goal === "pass" ? 3 : 1;
}

/** The trader assessment in the /home quiz style. Every step waits for Continue; nothing advances on its own. */
export function HomeAssessment() {
  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [mode, setMode] = useState<"questions" | "profile">("questions");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [lead, setLead] = useState<Lead>({ name: "", email: "" });
  const [leadError, setLeadError] = useState<string | null>(null);
  const totalSteps = QUESTIONS.length + 1;

  // Returning visitors see their saved profile; read after mount so server and client render the same first frame.
  useEffect(() => {
    const saved = loadAssessment();
    if (saved) {
      setRecord(saved);
      if (saved.lead) setLead(saved.lead);
      setMode("profile");
    }
  }, []);

  if (mode === "profile" && record) {
    return (
      <AssessmentProfile
        record={record}
        onRetake={() => {
          setAnswers({});
          setIndex(0);
          setLeadError(null);
          setMode("questions");
        }}
      />
    );
  }

  if (index === QUESTIONS.length) {
    const filled = lead.name.trim().length > 0 && lead.email.trim().length > 0;

    function submit(event: FormEvent) {
      event.preventDefault();
      if (!filled) return;
      if (!isValidEmail(lead.email)) {
        setLeadError("That email doesn’t look right. Try something like you@example.com.");
        return;
      }
      setRecord(recordAssessment(answers, record?.tgScore ?? null, lead));
      setMode("profile");
    }

    return (
      <div className={styles.quiz} key="lead">
        <div className={styles.quizHead}>
          <p className={styles.quizQuestion} id="assess-lead">
            Last step: where should we save your profile?
          </p>
          <span className={styles.quizCount} aria-label={`Step ${totalSteps} of ${totalSteps}`}>
            {totalSteps}/{totalSteps}
          </span>
        </div>
        <p className={styles.quizHint}>Add your name and email to see your trader profile.</p>

        <form className={styles.leadForm} onSubmit={submit} noValidate aria-labelledby="assess-lead">
          <label className={styles.leadField}>
            <span>Name</span>
            <input
              name="name"
              autoComplete="name"
              maxLength={80}
              value={lead.name}
              onChange={(event) => setLead((current) => ({ ...current, name: event.target.value }))}
              placeholder="Your name"
            />
          </label>
          <label className={styles.leadField} data-invalid={leadError ? true : undefined}>
            <span>Email</span>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
              value={lead.email}
              aria-invalid={leadError ? true : undefined}
              aria-describedby={leadError ? "lead-error" : undefined}
              onChange={(event) => {
                setLead((current) => ({ ...current, email: event.target.value }));
                if (leadError) setLeadError(null);
              }}
              placeholder="you@example.com"
            />
          </label>
          {leadError ? (
            <p className={styles.leadError} id="lead-error" role="alert">
              {leadError}
            </p>
          ) : null}

          <div className={styles.quizActions}>
            <button type="submit" className={styles.continue} disabled={!filled}>
              See my profile
            </button>
            <button type="button" className={styles.backButton} onClick={() => setIndex(QUESTIONS.length - 1)}>
              Back
            </button>
            {!filled ? <span className={styles.quizNeed}>Add your name and email to continue</span> : null}
          </div>
        </form>
      </div>
    );
  }

  const question = QUESTIONS[index];
  const selected = answers[question.id] ?? [];
  const answered = selected.length > 0;

  function pick(value: string) {
    setAnswers((current) => ({
      ...current,
      [question.id]: question.multi ? toggleMulti(current[question.id] ?? [], value) : [value],
    }));
  }

  function next() {
    if (!answered) return;
    setIndex((position) => position + 1);
  }

  return (
    <div className={styles.quiz} key={question.id}>
      <div className={styles.quizHead}>
        <p className={styles.quizQuestion} id={`assess-q-${question.id}`}>
          {question.prompt}
        </p>
        <span className={styles.quizCount} aria-label={`Step ${index + 1} of ${totalSteps}`}>
          {index + 1}/{totalSteps}
        </span>
      </div>
      <p className={styles.quizHint}>{question.multi ? "Choose all that apply" : "Choose one"}</p>

      <div
        className={styles.options}
        role={question.multi ? "group" : "radiogroup"}
        aria-labelledby={`assess-q-${question.id}`}
        data-columns={question.options.length > 5 ? 2 : 1}
      >
        {question.options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label key={option.value} className={styles.option} data-checked={checked} data-kind={question.multi ? undefined : "radio"}>
              <input
                type={question.multi ? "checkbox" : "radio"}
                name={`assess-${question.id}`}
                checked={checked}
                onChange={() => pick(option.value)}
              />
              <span className={styles.box} aria-hidden="true">
                {checked ? question.multi ? <CheckIcon /> : <i /> : null}
              </span>
              <span className={styles.optionText}>{option.label}</span>
            </label>
          );
        })}
      </div>

      <div className={styles.quizActions}>
        <button type="button" className={styles.continue} onClick={next} disabled={!answered}>
          Continue
        </button>
        {index > 0 ? (
          <button type="button" className={styles.backButton} onClick={() => setIndex((position) => position - 1)}>
            Back
          </button>
        ) : null}
        {!answered ? <span className={styles.quizNeed}>{question.multi ? "Pick at least one to continue" : "Pick one to continue"}</span> : null}
      </div>
    </div>
  );
}

function AssessmentProfile({ record, onRetake }: { record: AssessmentRecord; onRetake: () => void }) {
  const profile = profileFor(record.answers);
  const startNumber = startLessonFor(record.answers);
  const start = FOUNDATIONS_LESSONS[startNumber - 1];

  return (
    <div className={styles.quiz} key="profile">
      <p className={styles.resultKicker}>You trade like</p>
      <p className={styles.resultHeadline}>{profile.name}</p>
      <p className={styles.resultLine}>{profile.line}</p>

      <div className={styles.resultStart}>
        <span className={styles.resultThumb} style={{ "--focus": COURSES[0].focus } as CSSProperties}>
          <Image src={COURSES[0].image} alt="" fill sizes="88px" />
        </span>
        <span>
          <small>Start with Course 1 · Foundations</small>
          <strong>
            Lesson {start.number}: {start.title}
          </strong>
          <em>Why: {START_REASON[start.number] ?? "it’s the best place to begin"}.</em>
        </span>
      </div>

      <div className={styles.quizActions}>
        <Link href={`/?lesson=${start.number}`} className={styles.continue}>
          Start Lesson {start.number} <ArrowRight />
        </Link>
        <button type="button" className={styles.backButton} onClick={onRetake}>
          Retake assessment
        </button>
      </div>
    </div>
  );
}
