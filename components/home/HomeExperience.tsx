"use client";

import Image from "next/image";
import Link from "next/link";
import { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import styles from "./Home.module.css";
import { COURSES, type Course } from "./courses";
import { HomeAssessment } from "./HomeAssessment";

/* ---------- icons ---------- */

function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ArrowRight = () => (
  <Svg>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </Svg>
);
const ChevronLeft = () => (
  <Svg size={20}>
    <path d="m15 6-6 6 6 6" strokeWidth="2.4" />
  </Svg>
);
const ChevronRight = () => (
  <Svg size={20}>
    <path d="m9 6 6 6-6 6" strokeWidth="2.4" />
  </Svg>
);
const PauseIcon = () => (
  <Svg size={16}>
    <path d="M9 6v12M15 6v12" strokeWidth="2.8" />
  </Svg>
);
const PlayIcon = () => (
  <Svg size={16}>
    <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="none" />
  </Svg>
);

/* ---------- portrait mosaic ---------- */

const focusStyle = (course: Course) => ({ "--focus": course.focus }) as CSSProperties;

type Tile = { kind: "photo"; course: Course } | { kind: "market" } | { kind: "fill" } | { kind: "risk" };

const COLUMN_A: Tile[] = [{ kind: "photo", course: COURSES[0] }, { kind: "market" }, { kind: "photo", course: COURSES[2] }, { kind: "risk" }];
const COLUMN_B: Tile[] = [{ kind: "photo", course: COURSES[1] }, { kind: "fill" }, { kind: "photo", course: COURSES[3] }, { kind: "photo", course: COURSES[0] }];

function MosaicTile({ tile }: { tile: Tile }) {
  if (tile.kind === "photo") {
    return (
      <figure className={styles.tilePhoto} data-concealed={tile.course.concealed ?? false} style={focusStyle(tile.course)}>
        {/* Eager: the looping track moves duplicates into view continuously; lazy loading would flash empty tiles. */}
        <Image src={tile.course.image} alt="" fill sizes="(max-width: 1200px) 22vw, 300px" loading="eager" />
        <figcaption>
          <span>Course {tile.course.id}</span>
          <b>{tile.course.concealed ? "Coming soon" : tile.course.title.join(" ")}</b>
        </figcaption>
      </figure>
    );
  }
  if (tile.kind === "market") {
    return (
      <div className={styles.tileInfo}>
        <span className={styles.tileLive}>Live</span>
        <p>Chiefs to win?</p>
        <strong>
          YES <b>60¢</b>
        </strong>
        <svg viewBox="0 0 120 36" className={styles.tileSpark} aria-hidden="true">
          <path d="M0 26 L12 24 L22 27 L34 20 L46 22 L58 14 L70 17 L82 10 L94 13 L106 6 L120 8" fill="none" stroke="#3b82ff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (tile.kind === "fill") {
    return (
      <div className={styles.tileInfo}>
        <span className={styles.tileTag}>Order filled</span>
        <p>100 YES contracts</p>
        <strong>
          avg <b>59.30¢</b>
        </strong>
        <small className={styles.tileGood}>−0.70¢ vs the price shown</small>
      </div>
    );
  }
  return (
    <div className={styles.tileInfo}>
      <span className={styles.tileTag}>Risk limit</span>
      <p>Max loss per trade</p>
      <strong>
        <b>$20</b>
      </strong>
      <small className={styles.tileGood}>2% of your account</small>
    </div>
  );
}

function PortraitMosaic() {
  const [paused, setPaused] = useState(false);
  return (
    <div className={styles.mosaic} data-paused={paused} aria-label="Catalyst Academy courses">
      {[COLUMN_A, COLUMN_B].map((column, columnIndex) => (
        <div key={columnIndex} className={styles.mosaicColumn} data-column={columnIndex}>
          <div className={styles.mosaicTrack}>
            {[...column, ...column].map((tile, index) => (
              <MosaicTile key={index} tile={tile} />
            ))}
          </div>
        </div>
      ))}
      <button type="button" className={styles.mosaicToggle} onClick={() => setPaused((current) => !current)} aria-label={paused ? "Play animation" : "Pause animation"}>
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
}

/* ---------- course cards ---------- */

function CourseCard({ course, onUnavailable }: { course: Course; onUnavailable: (course: Course) => void }) {
  const body = (
    <>
      <span className={styles.cardArt}>
        <Image src={course.image} alt="" fill sizes="(max-width: 640px) 82vw, (max-width: 1100px) 40vw, 300px" />
      </span>
      <span className={styles.badge} data-status={course.status}>
        {course.status === "new" ? "New" : "Coming Soon"}
      </span>
      <span className={styles.cardBody} aria-hidden={course.concealed ? true : undefined}>
        <span className={styles.cardKicker}>Course {course.id}</span>
        <span className={styles.cardTitle} data-long={course.title.join(" ").length > 22}>
          {course.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
        <span className={styles.cardRule} />
        <span className={styles.cardMeta}>
          {course.lessons} lessons <i>•</i> ~{course.minutes} minutes
        </span>
      </span>
      <span className={styles.cardCta}>
        {course.href ? (
          <>
            Start course <ArrowRight />
          </>
        ) : (
          "Not open yet"
        )}
      </span>
    </>
  );

  return course.href ? (
    <Link href={course.href} className={styles.card} data-open="true" aria-label={`Course ${course.id}: ${course.title.join(" ")}. Start course.`}>
      {body}
    </Link>
  ) : (
    <button
      type="button"
      className={styles.card}
      data-concealed={course.concealed ?? false}
      onClick={() => onUnavailable(course)}
      aria-label={course.concealed ? `Course ${course.id}: coming soon.` : `Course ${course.id}: ${course.title.join(" ")}. Coming soon.`}
    >
      {body}
    </button>
  );
}

function CourseCarousel({ onUnavailable }: { onUnavailable: (course: Course) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [showAll, setShowAll] = useState(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({ start: track.scrollLeft <= 4, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, showAll]);

  function page(direction: 1 | -1) {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const before = track.scrollLeft;
    const target = before + direction * (card.offsetWidth + 20);
    track.scrollTo({ left: target, behavior: "smooth" });
    // Smooth scrolling can be dropped in throttled tabs; land on the target either way.
    window.setTimeout(() => {
      if (Math.abs(track.scrollLeft - before) < 2) track.scrollTo({ left: target });
      measure();
    }, 650);
  }

  return (
    <section className={styles.courses} id="courses" aria-labelledby="popular-heading">
      <div className={styles.coursesHead}>
        <div className={styles.coursesTitle}>
          <h2 id="popular-heading">Popular now</h2>
          <button type="button" className={styles.seeAll} onClick={() => setShowAll((current) => !current)} aria-expanded={showAll}>
            {showAll ? "Show less" : "See all"}
          </button>
        </div>
        {showAll ? null : (
          <div className={styles.arrows}>
            <button type="button" onClick={() => page(-1)} disabled={edges.start} aria-label="Previous courses">
              <ChevronLeft />
            </button>
            <button type="button" onClick={() => page(1)} disabled={edges.end} aria-label="Next courses">
              <ChevronRight />
            </button>
          </div>
        )}
      </div>

      <div ref={trackRef} className={styles.track} data-grid={showAll} onScroll={measure}>
        {COURSES.map((course) => (
          <CourseCard key={course.id} course={course} onUnavailable={onUnavailable} />
        ))}
      </div>
    </section>
  );
}

/* ---------- page ---------- */

export function HomeExperience() {
  const [notice, setNotice] = useState<Course | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openCount = COURSES.filter((course) => course.href).length;
  const openLessons = COURSES.filter((course) => course.href).reduce((sum, course) => sum + course.lessons, 0);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/home" className={styles.brand} aria-label="Catalyst Academy home">
          <Image src="/logo.png" alt="Catalyst" width={962} height={192} className={styles.logo} loading="eager" fetchPriority="high" />
          <span>Academy</span>
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroCopy}>
          <h1 id="hero-heading" className={styles.heroTitle}>
            Learn the market,
            <br />
            find your edge.
          </h1>
          <p className={styles.heroLead}>Bite-sized, interactive lessons on prediction markets. Practice with simulated money before you risk a cent.</p>
          <span className={styles.heroRule} aria-hidden="true" />
          <HomeAssessment />
        </div>
        <PortraitMosaic />
      </section>

      <h2 className={styles.inspiration}>
        A dose of inspiration, whenever you need it.
      </h2>

      <CourseCarousel onUnavailable={setNotice} />

      {notice ? (
        <div className={styles.toast} role="status" key={notice.id}>
          <p>
            <b>{notice.concealed ? `Course ${notice.id}` : notice.title.join(" ")}</b> isn’t open yet. Start with Foundations while you wait.
          </p>
          <Link href="/" className={styles.toastLink}>
            Start Foundations
          </Link>
        </div>
      ) : null}

      <div className={styles.stickyBar}>
        <div className={styles.stickyInner}>
          <div className={styles.avatars} aria-hidden="true">
            {COURSES.map((course) => (
              <span key={course.id} data-concealed={course.concealed ?? false} style={focusStyle(course)}>
                <Image src={course.image} alt="" fill sizes="40px" />
              </span>
            ))}
          </div>
          <p className={styles.stickyCopy}>
            <strong className={styles.stickyLong}>
              {openCount === 1 ? "Foundations is open now" : `${openCount} courses open now`} · {openLessons} interactive lessons
            </strong>
            <strong className={styles.stickyShort}>{openLessons} lessons open now</strong>
            <small>Practice with simulated money. Nothing real is at risk.</small>
          </p>
          <Link href="/" className={styles.stickyCta}>
            Start learning
          </Link>
        </div>
      </div>
    </main>
  );
}
