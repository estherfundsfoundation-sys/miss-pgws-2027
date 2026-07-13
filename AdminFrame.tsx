import Image from "next/image";
import Link from "next/link";
import content from "../content/application-content.json";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";

const featuredDates = [
  "applications-open",
  "priority-deadline",
  "final-application-deadline",
  "queen-training-and-official-onboarding",
];

export default function Home() {
  const dates = content.calendar.dates.filter((item) => featuredDates.includes(item.id));

  return (
    <main>
      <SiteHeader />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">MISS PRETTY GIRLS WHO SERVE · CLASS OF 2027</p>
          <h1>The New <span>Beauty Issue</span></h1>
          <p className="hero-tagline">This Isn’t About Makeup. This Is About You.</p>
          <p className="hero-description">{content.publicCopy.coreMessage}</p>
          <div className="hero-actions">
            <Link className="button button--lipstick" href="/apply">Become the next Miss PGWS</Link>
            <a className="button button--paper" href={content.meta.urls.interestGroupMe} target="_blank" rel="noreferrer">Join the interest chat ↗</a>
          </div>
        </div>
        <div className="hero-art">
          <Image src="/brand/new-beauty-issue-cover.png" alt="Miss Pretty Girls Who Serve 2027 — The New Beauty Issue" fill priority sizes="(max-width: 1040px) 100vw, 45vw" />
        </div>
        <span className="hero-ruby" aria-hidden="true" />
      </section>

      <div className="ticker" aria-label="Competition pillars">
        {['Faith', 'Sisterhood', 'Leadership', 'Scholarship', 'Service', 'Purpose'].map((item) => <span key={item}>{item}</span>)}
      </div>

      <section className="section section--paper">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE COVER STORY</p>
            <h2>A different kind of crown.</h2>
          </div>
          <p>{content.publicCopy.competitionDescription} The competition makes room for a woman’s faith, service, story, leadership, and commitment to helping other students persist through college.</p>
        </div>
        <div className="editorial-grid">
          <article className="editorial-card" data-number="01">
            <p className="eyebrow">IDENTITY</p>
            <h3>Rooted in Christ</h3>
            <p>Explore beauty and worth through faith, dignity, wisdom, and character—not one worldly standard.</p>
          </article>
          <article className="editorial-card editorial-card--accent" data-number="02">
            <p className="eyebrow eyebrow--light">IMPACT</p>
            <h3>Service with purpose</h3>
            <p>Build an advocacy platform connected to service, student success, belonging, and college-dropout prevention.</p>
          </article>
          <article className="editorial-card" data-number="03">
            <p className="eyebrow">LEADERSHIP</p>
            <h3>A title that works</h3>
            <p>Train, campaign, lead, communicate, and carry the mission forward as a visible servant-leader.</p>
          </article>
        </div>
      </section>

      <section className="scripture-strip">
        <blockquote>“{content.signatureScripture.text}”</blockquote>
        <cite>{content.signatureScripture.reference} · {content.signatureScripture.translation}</cite>
      </section>

      <section className="section section--blush">
        <div className="deadline-panel">
          <div className="deadline-copy">
            <p className="eyebrow">THE 2027 ISSUE · OPERATING IN 2026</p>
            <h2>Your moment starts now.</h2>
            <p className="lede">Applications are open to eligible Christian college women. Review the official dates before beginning your application.</p>
            <div className="deadline-list">
              {dates.map((item) => (
                <div className="deadline-item" key={item.id}>
                  <b>{item.label}</b>
                  <span>{item.display}</span>
                </div>
              ))}
            </div>
            <div className="hero-actions" style={{ marginTop: 28 }}>
              <Link className="button button--ink" href="/apply">Review & begin</Link>
              <Link className="button button--paper" href="/timeline">Full timeline</Link>
            </div>
          </div>
          <div className="deadline-art">
            <Image src="/brand/competition-brand-foundations.png" alt="The New Beauty Issue competition brand palette and visual direction" width={1536} height={2048} sizes="(max-width: 1040px) 100vw, 45vw" />
          </div>
        </div>
      </section>

      <section className="section section--ink">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow--light">SCHOLARSHIP & FUNDRAISING</p>
            <h2>Votes create impact.</h2>
          </div>
          <p>{content.publicCopy.scholarshipAndFundraisingMessage}</p>
        </div>
        <div className="editorial-grid">
          <article className="editorial-card">
            <p className="eyebrow">FIRST PLACE</p>
            <h3>Miss Pretty Girls Who Serve</h3>
            <p>10% of verified competition voting donations, with a guaranteed $1,000 minimum once the competition officially proceeds.</p>
          </article>
          <article className="editorial-card">
            <p className="eyebrow">SECOND PLACE</p>
            <h3>Miss Pretty Girls University</h3>
            <p>A campus-centered title with a scholarship amount published before voting begins.</p>
          </article>
          <article className="editorial-card editorial-card--accent">
            <p className="eyebrow eyebrow--light">SCORING</p>
            <h3>85% votes · 15% performance</h3>
            <p>Each verified vote is a $2.50 donation. Final placement is confirmed only after the official audit.</p>
          </article>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
