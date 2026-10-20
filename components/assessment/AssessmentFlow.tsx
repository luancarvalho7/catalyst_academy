"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "../home/Home.module.css";
import { HomeAssessment } from "../home/HomeAssessment";

/** Standalone /assessment: the same assessment as the /home hero, on its own page. */
export function AssessmentFlow() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/home" className={styles.brand} aria-label="Catalyst Academy home">
          <Image src="/logo.png" alt="Catalyst" width={962} height={192} className={styles.logo} loading="eager" fetchPriority="high" />
          <span>Academy</span>
        </Link>
      </header>
      <section className={styles.assessmentPage} aria-labelledby="assessment-heading">
        <h1 id="assessment-heading" className={styles.assessmentTitle}>
          Trader assessment
        </h1>
        <p className={styles.heroLead}>Six quick questions. Your answers build your trader profile.</p>
        <span className={styles.heroRule} aria-hidden="true" />
        <HomeAssessment />
      </section>
    </main>
  );
}
