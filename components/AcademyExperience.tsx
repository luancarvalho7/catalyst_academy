"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { LessonFlow } from "./LessonFlow";
import { BuyTheSpread } from "./practice/BuyTheSpread";
import { ExitGame } from "./practice/ExitGame";
import { TraderOrGambler } from "./practice/TraderOrGambler";
import { RiskDecision } from "./practice/RiskDecision";
import styles from "./AcademyExperience.module.css";

type Lesson = {
  title: string;
  heading: string;
  description: string;
  kind: "intro" | "flow" | "practice" | "placeholder";
  practice?: "traderOrGambler" | "risk" | "spread" | "exit";
  contentVideo?: string;
  railVideo?: string;
};

// `failed` marks a coach-side error notice: shown in the chat, never sent back as history.
type ChatMessage = { role: "user" | "coach"; text: string; failed?: boolean };

const COACH_FALLBACK_ERROR = "The coach couldn’t answer right now. Try again.";

const LESSONS: Lesson[] = [
  {
    title: "Introduction to Catalyst Academy",
    heading: "Introduction to Catalyst Academy",
    description: "",
    kind: "practice",
    practice: "traderOrGambler",
    contentVideo: "1gnprE-Wy3c",
  },
  {
    title: "How Prediction Markets Work",
    heading: "How Prediction Markets Work",
    description: "Markets turn opinions into prices.",
    kind: "flow",
    railVideo: "Z1xSWRPe9kI",
  },
  {
    title: "How Much Should You Risk?",
    heading: "Choose Your Risk",
    description: "Start small, protect your balance, and never risk more than you are comfortable losing.",
    kind: "practice",
    practice: "risk",
    railVideo: "2kM6sJgMD9s",
  },
  {
    title: "How Do You Actually Get Filled?",
    heading: "Getting Your Order Filled",
    description: "Your trade fills when another trader takes the other side at the price you chose.",
    kind: "practice",
    practice: "spread",
    railVideo: "ZviqW_7QJJM",
  },
  {
    title: "When Do You Get Out?",
    heading: "Plan Your Exit",
    description: "You can sell before the event resolves or hold your position through the final outcome.",
    kind: "practice",
    practice: "exit",
    railVideo: "Qa3K92CQ30c",
  },
];

function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  return (
    <iframe
      src={`https://www.youtube.com/embed/${id}`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}

function PracticeLesson({
  practice,
  videoId,
  ...props
}: {
  practice: NonNullable<Lesson["practice"]>;
  videoId?: string;
  lessonNumber: number;
  lessonTotal: number;
  onNextLesson?: () => void;
}) {
  if (practice === "traderOrGambler") return <TraderOrGambler {...props} videoId={videoId} />;
  if (practice === "risk") return <RiskDecision {...props} />;
  if (practice === "spread") return <BuyTheSpread {...props} />;
  return <ExitGame {...props} />;
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ContentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10h8M8 14h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 4v-4H7.5A2.5 2.5 0 0 1 5 12.5v-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5m0 0-5 5m5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const VISITED_KEY = "catalyst-academy-visited-v1";

/** Visited lessons live only in this browser, keyed by title so reordering or removing lessons can't shift them. */
function readVisited(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(VISITED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writeVisited(titles: string[]) {
  try {
    window.localStorage.setItem(VISITED_KEY, JSON.stringify(titles));
  } catch {
    // Blocked storage: the menu just won't remember visits.
  }
}

export function AcademyExperience() {
  const [activeLesson, setActiveLesson] = useState(0);
  const [visited, setVisited] = useState<string[]>([]);
  const [visitsReady, setVisitsReady] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"content" | "assist">("content");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [coachPending, setCoachPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const coachRequestRef = useRef<AbortController | null>(null);
  const lesson = LESSONS[activeLesson];

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, coachPending]);

  useEffect(() => () => coachRequestRef.current?.abort(), []);

  // `/?lesson=3` deep-links from /home; read after mount so server and client render the same first frame.
  // Visits load in the same pass so a deep link doesn't mark Lesson 1 as visited on the way in.
  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("lesson"));
    if (Number.isInteger(requested) && requested >= 1 && requested <= LESSONS.length) setActiveLesson(requested - 1);
    setVisited(readVisited());
    setVisitsReady(true);
  }, []);

  useEffect(() => {
    if (!visitsReady) return;
    const title = LESSONS[activeLesson].title;
    setVisited((current) => {
      if (current.includes(title)) return current;
      const next = [...current, title];
      writeVisited(next);
      return next;
    });
  }, [activeLesson, visitsReady]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  function chooseLesson(index: number) {
    coachRequestRef.current?.abort();
    coachRequestRef.current = null;
    setCoachPending(false);
    setActiveLesson(index);
    setMessages([]);
    setMenuOpen(false);
    setMobileTab("content");
  }

  async function askCoach(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || coachPending) return;

    const conversation: ChatMessage[] = [...messages, { role: "user", text: trimmed }];
    setMessages(conversation);
    setQuestion("");
    setCoachPending(true);
    requestAnimationFrame(() => inputRef.current?.focus());

    const controller = new AbortController();
    coachRequestRef.current = controller;
    let reply: ChatMessage;
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson: activeLesson + 1,
          messages: conversation.filter((message) => !message.failed).map(({ role, text }) => ({ role, text })),
        }),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => null)) as { reply?: string; error?: string } | null;
      reply = response.ok && result?.reply
        ? { role: "coach", text: result.reply }
        : { role: "coach", text: result?.error ?? COACH_FALLBACK_ERROR, failed: true };
    } catch {
      reply = { role: "coach", text: COACH_FALLBACK_ERROR, failed: true };
    }

    // A lesson switch aborts the request and clears the chat; a late answer must not land in the next lesson.
    if (controller.signal.aborted) return;
    coachRequestRef.current = null;
    setMessages((current) => [...current, reply]);
    setCoachPending(false);
  }

  return (
    <main className={styles.shell}>
      <header className={styles.mobileBar}>
        <button className={styles.iconButton} type="button" onClick={() => setMenuOpen(true)} aria-label="Open lessons menu" aria-expanded={isMenuOpen}>
          <MenuIcon />
        </button>
        <Image src="/logo.png" alt="Catalyst Academy" width={962} height={192} className={styles.mobileLogo} priority />
        <span className={styles.mobileBarSpacer} />
      </header>

      {isMenuOpen ? <div className={styles.scrim} role="presentation" onClick={() => setMenuOpen(false)} /> : null}

      <aside className={`${styles.sidebar} ${isMenuOpen ? styles.sidebarOpen : ""}`} aria-label="Course lessons">
        <div className={styles.brandRow}>
          <div className={styles.brand} aria-label="Catalyst Academy">
            <Image src="/logo.png" alt="Catalyst" width={962} height={192} className={styles.logo} priority />
            <span className={styles.academy}>ACADEMY</span>
          </div>
          <button className={`${styles.iconButton} ${styles.drawerClose}`} type="button" onClick={() => setMenuOpen(false)} aria-label="Close lessons menu">
            <CloseIcon />
          </button>
        </div>

        <nav className={styles.lessonNav}>
          {LESSONS.map((item, index) => {
            const isActive = index === activeLesson;
            const wasVisited = !isActive && visited.includes(item.title);
            return (
              <button
                key={item.title}
                type="button"
                className={`${styles.lessonButton} ${isActive ? styles.lessonActive : ""} ${wasVisited ? styles.lessonVisited : ""}`}
                onClick={() => chooseLesson(index)}
                aria-current={isActive ? "step" : undefined}
              >
                <span className={styles.lessonNumber}>{index + 1}</span>
                <span className={styles.lessonTitle}>
                  {item.title}
                  {wasVisited ? <span className={styles.srOnly}> (visited)</span> : null}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className={`${styles.lessonContent} ${mobileTab === "content" ? "" : styles.paneHidden}`} key={activeLesson}>
        {lesson.kind === "intro" && lesson.contentVideo ? (
          <div className={styles.introStage}>
            <div className={styles.introVideo}>
              <YouTubeEmbed id={lesson.contentVideo} title={lesson.title} />
            </div>
          </div>
        ) : lesson.kind === "flow" ? (
          <LessonFlow lessonNumber={activeLesson + 1} lessonTotal={LESSONS.length} onNextLesson={() => chooseLesson(activeLesson + 1)} />
        ) : lesson.kind === "practice" && lesson.practice ? (
          <PracticeLesson
            practice={lesson.practice}
            videoId={lesson.contentVideo}
            lessonNumber={activeLesson + 1}
            lessonTotal={LESSONS.length}
            onNextLesson={activeLesson + 1 < LESSONS.length ? () => chooseLesson(activeLesson + 1) : undefined}
          />
        ) : (
          <>
            <header className={styles.lessonHeader}>
              <p className={styles.lessonKicker}>Lesson {activeLesson + 1} of {LESSONS.length}</p>
              <h1>{lesson.heading}</h1>
              <p>{lesson.description}</p>
            </header>

            <section className={styles.practiceCard} aria-label="Practice trade area">
              <span>Leave Empty</span>
            </section>
          </>
        )}
      </section>

      <aside className={`${styles.supportRail} ${mobileTab === "assist" ? "" : styles.paneHidden}`}>
        {lesson.railVideo ? (
          <div className={styles.videoBlock}>
            <p className={styles.videoLabel}>Watch the lesson</p>
            <div className={styles.videoFrame}>
              <YouTubeEmbed id={lesson.railVideo} title={lesson.title} />
            </div>
          </div>
        ) : null}

        <section className={styles.coach} aria-label="AI Coach">
          <div className={styles.chatBody} aria-live="polite" ref={chatRef}>
            {messages.length === 0 ? (
              <p className={styles.emptyState}>Get instant help as you learn</p>
            ) : (
              messages.map((message, index) => (
                <p
                  className={message.role === "user" ? styles.userMessage : `${styles.coachMessage} ${message.failed ? styles.coachFailed : ""}`}
                  key={index}
                >
                  {message.text}
                </p>
              ))
            )}
            {coachPending ? (
              <p className={styles.coachTyping} role="status">
                <span className={styles.srOnly}>The coach is typing</span>
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </p>
            ) : null}
          </div>

          <form className={styles.chatForm} onSubmit={askCoach}>
            <label className={styles.srOnly} htmlFor="coach-question">Ask the AI coach a question</label>
            <input
              ref={inputRef}
              id="coach-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask anything"
              autoComplete="off"
            />
            <button type="submit" aria-label="Send question" disabled={!question.trim() || coachPending}><ArrowIcon /></button>
          </form>
        </section>
      </aside>

      <nav className={styles.bottomNav} aria-label="Lesson sections">
        <button type="button" className={mobileTab === "content" ? styles.tabActive : ""} onClick={() => setMobileTab("content")} aria-current={mobileTab === "content" ? "page" : undefined}>
          <ContentIcon />
          <span>Content</span>
        </button>
        <button type="button" className={mobileTab === "assist" ? styles.tabActive : ""} onClick={() => setMobileTab("assist")} aria-current={mobileTab === "assist" ? "page" : undefined}>
          <ChatIcon />
          <span>{lesson.railVideo ? "Chat / Video" : "Chat"}</span>
        </button>
      </nav>
    </main>
  );
}
