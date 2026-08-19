"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./sister-check-in.module.css";

function safeFirstName(value: string | null) {
  const cleaned = (value ?? "").replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ' -]/g, "").trim();
  return cleaned.split(/\s+/)[0]?.slice(0, 32) || "Pretty Sister";
}

export function SisterCheckInClient() {
  const searchParams = useSearchParams();
  const name = safeFirstName(searchParams.get("name"));

  return (
    <main className={styles.page}>
      <div className={styles.glowOne} aria-hidden="true" />
      <div className={styles.glowTwo} aria-hidden="true" />
      <div className={styles.sparkles} aria-hidden="true">
        <span>✦</span><span>♡</span><span>✧</span><span>♕</span><span>✦</span><span>♡</span>
      </div>

      <section className={styles.card} aria-labelledby="sister-title">
        <p className={styles.issue}>THE NEW BEAUTY ISSUE · 2027</p>
        <div className={styles.crown} aria-hidden="true">♕</div>
        <p className={styles.script}>A little love note for</p>
        <h1 id="sister-title">Hey, Pretty Sister<br /><em>{name}!</em></h1>
        <p className={styles.lede}>It has been a few days since Queen Training, and we wanted to check on you.</p>

        <div className={styles.note}>
          <span aria-hidden="true">♡</span>
          <p>If you need clarity, encouragement, help with your profile, headshot, platform, campaign video—or simply someone to talk to—please reach out. We are here for you.</p>
        </div>

        <blockquote>
          “Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.”
          <cite>Philippians 1:6 · KJV</cite>
        </blockquote>

        <div className={styles.affirmation}>
          <span>YOU ARE CALLED.</span><span>YOU ARE CAPABLE.</span><span>YOU’VE GOT THIS.</span>
        </div>

        <div className={styles.actions}>
          <a href="mailto:nationals@estherfundsinc.org?subject=Pretty%20Sister%20Check-In">Tell us what you need</a>
          <Link href="/portal">Open Contestant Studio</Link>
        </div>

        <p className={styles.signature}>With love, your PGWS sisters ♡</p>
        <p className={styles.footer}>MISS PRETTY GIRLS WHO SERVE · ESTHER FUNDS FOUNDATION</p>
      </section>
    </main>
  );
}
