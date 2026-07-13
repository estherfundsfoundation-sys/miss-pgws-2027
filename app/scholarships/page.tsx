import type { Metadata } from "next";
import Link from "next/link";
import content from "../../content/application-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "Scholarships & Scoring" };

export default function ScholarshipsPage() {
  return <main>
    <SiteHeader compact />
    <section className="page-hero"><div className="page-hero-inner"><p className="eyebrow">CROWNED WITH PURPOSE</p><h1>Scholarship meets service.</h1><p className="lede">Verified votes power scholarships and mission-centered programming. The competition is transparent about what counts, how rankings work, and when results become final.</p></div></section>
    <section className="section section--paper">
      <div className="editorial-grid">
        <article className="editorial-card editorial-card--accent" data-number="01"><p className="eyebrow eyebrow--light">FIRST PLACE</p><h3>{content.prizes[0].title}</h3><p>{content.prizes[0].scholarshipFormula}, with a guaranteed ${content.prizes[0].guaranteedMinimumUsd?.toLocaleString()} minimum once the competition officially proceeds. The maximum will be published before voting.</p></article>
        <article className="editorial-card" data-number="02"><p className="eyebrow">SECOND PLACE</p><h3>{content.prizes[1].title}</h3><p>The scholarship amount will be published before voting begins. No amount is presented until it is approved.</p></article>
        <article className="editorial-card" data-number="85"><p className="eyebrow">FINAL SCORE</p><h3>85% verified votes</h3><p>Performance points make up the remaining 15%. Final results require the official audit.</p></article>
      </div>
    </section>
    <section className="section"><div className="section-heading"><div><p className="eyebrow">DONOR CLARITY</p><h2>${content.voting.pricePerVoteUsd.toFixed(2)} per verified vote.</h2></div><p>{content.voting.donorLanguage}</p></div><div className="notice"><span>◆</span><div><strong>Provisional means provisional.</strong><br />Pending, failed, refunded, disputed, duplicated, fraudulent, voided, or late payments do not count as verified votes and may change displayed totals.</div></div><div style={{marginTop:30}}><a className="button button--lipstick" href={content.voting.jotformUrl} target="_blank" rel="noreferrer">Open the official voting form ↗</a> <Link className="button button--paper" href="/leaderboard">View leaderboard</Link></div></section>
    <SiteFooter />
  </main>;
}
