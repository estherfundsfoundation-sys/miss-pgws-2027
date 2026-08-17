import Link from "next/link";
import content from "../../content/application-content.json";
import { LaunchAction } from "../components/LaunchAction";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export default function VotePage() {
  return (
    <main>
      <SiteHeader compact />
      <section className="vote-hero">
        <div className="vote-hero__logo">
          <img src="/brand/miss-pgws-2027-logo.png" alt="Miss Pretty Girls Who Serve 2027" />
        </div>
        <p className="eyebrow">THE OFFICIAL VOTE</p>
        <h1>Choose a leader.<br /><em>Fund a future.</em></h1>
        <p className="lede">Every eligible $2.50 vote supports the scholarship competition and helps determine the 2027 titleholders. The secure official ballot is embedded directly below.</p>
        <div className="hero-actions">
          <a className="button button--lipstick" href="#official-ballot">View the official ballot</a>
          <Link className="button button--paper" href="/contestants">Meet the contestants</Link>
          <Link className="button button--ink" href="/leaderboard">Live leaderboard</Link>
        </div>
      </section>
      <section className="credibility-band">
        <div><strong>$2.50</strong><span>per eligible vote</span></div>
        <div><strong>85%</strong><span>verified vote score</span></div>
        <div><strong>15%</strong><span>performance score</span></div>
        <div><strong>Final</strong><span>after official audit</span></div>
      </section>
      <section className="official-ballot-section" id="official-ballot">
        <div className="official-ballot-heading">
          <div>
            <p className="eyebrow">SECURE OFFICIAL BALLOT</p>
            <h2>Vote without leaving our website.</h2>
          </div>
          <div className="official-ballot-window">
            <strong>Voting opens</strong>
            <span>August 27, 2026 · 12:00 PM ET</span>
            <strong>Voting closes</strong>
            <span>September 3, 2026 · 11:59 PM ET</span>
          </div>
        </div>
        <div className="official-ballot-frame">
          <iframe
            title="Miss Pretty Girls Who Serve 2027 official voting ballot"
            src={content.voting.jotformUrl}
            loading="eager"
            allow="payment"
          />
        </div>
        <p className="official-ballot-help">If the embedded ballot does not load on your device, <a href={content.voting.jotformUrl} target="_blank" rel="noreferrer">open the secure form in a new window</a>. Voting remains closed until the official opening time.</p>
      </section>
      <section className="section section--paper">
        <div className="section-heading">
          <div><p className="eyebrow">VOTE WITH CONFIDENCE</p><h2>Know what counts.</h2></div>
          <p>Displayed rankings are provisional until every eligible payment is reconciled and audited.</p>
        </div>
        <div className="vote-steps">
          <article><span>01</span><h3>Choose</h3><p>Select the woman whose service, leadership, and platform you want to support.</p></article>
          <article><span>02</span><h3>Contribute</h3><p>Complete your $2.50-per-vote contribution through the secure official ballot.</p></article>
          <article><span>03</span><h3>Verify</h3><p>Eligible, completed payments are reconciled into certified vote totals.</p></article>
          <article><span>04</span><h3>Follow</h3><p>Watch the live provisional leaderboard while remembering that the audit determines final results.</p></article>
        </div>
        <div className="center-actions">
          <LaunchAction kind="voting" />
          <Link className="button button--paper" href="/contestants">Contestant profiles</Link>
          <Link className="button button--ink" href="/leaderboard">Live rankings</Link>
          <Link className="button button--paper" href="/donor-center">Donor terms</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
