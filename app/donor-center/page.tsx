import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import org from "../../content/organization-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "Donor Center" };

const impact = [
  ["Scholarship support", "Votes help fund scholarship awards that support students as they continue their education."],
  ["College persistence", "Support strengthens mission-centered work designed to help students remain enrolled and move toward graduation."],
  ["Leadership development", "Contestants receive a structured experience centered on faith, service, advocacy, communication, and leadership."],
  ["Student belonging", "Programming creates spaces where college women can build sisterhood, confidence, purpose, and support networks."],
];

export default function DonorCenterPage() {
  return <main>
    <SiteHeader compact />
    <section className="donor-hero">
      <div>
        <p className="eyebrow">THE DONOR CENTER</p>
        <h1>Your vote does more than move a number.</h1>
        <p className="lede">It supports a national scholarship experience backed by a faith-based 501(c)(3) organization committed to student success, leadership, and college-dropout prevention.</p>
        <div className="hero-actions"><Link className="button button--lipstick" href="/vote">Vote with purpose</Link><a className="button button--paper" href={`mailto:${org.competition.contactEmail}`}>Ask a donor question</a></div>
      </div>
      <aside className="donor-trust-card">
        <Image src={org.estherFundsFoundation.logo} alt="Esther Funds Foundation" width={210} height={210} />
        <p>Presented in support of</p>
        <h2>Esther Funds Foundation</h2>
        <strong>{org.estherFundsFoundation.designation}</strong>
        <span>EIN: {org.estherFundsFoundation.ein}</span>
        <a href={org.estherFundsFoundation.website} target="_blank" rel="noreferrer">Verify our mission and work ↗</a>
      </aside>
    </section>

    <section className="credibility-band">
      <div><strong>$2.50</strong><span>per verified vote</span></div>
      <div><strong>85%</strong><span>of the final score</span></div>
      <div><strong>501(c)(3)</strong><span>nonprofit-backed experience</span></div>
      <div><strong>Audit</strong><span>before results are final</span></div>
    </section>

    <section className="section section--paper">
      <div className="section-heading"><div><p className="eyebrow">WHY YOUR VOTE MATTERS</p><h2>A donation with a destination.</h2></div><p>Every eligible vote helps a contestant advance while supporting a broader scholarship and student-success mission. Votes are contributions to the competition—not personal gifts to contestants.</p></div>
      <div className="impact-grid">{impact.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="section donor-transparency">
      <div className="transparency-copy"><p className="eyebrow">TRANSPARENCY & ACCOUNTABILITY</p><h2>Trust is part of the crown.</h2><p>Only verified votes count. Pending, failed, refunded, disputed, duplicated, fraudulent, voided, or late payments are excluded and may change provisional totals. Rankings remain provisional until reconciliation and the official audit are complete.</p><Link className="button button--ink" href="/leaderboard">See the live leaderboard</Link></div>
      <div className="transparency-list">
        <div><b>Clear pricing</b><p>Each eligible vote is a $2.50 donation through the official voting form.</p></div>
        <div><b>Verified totals</b><p>Payment status and eligibility are reconciled before votes are certified.</p></div>
        <div><b>Published scoring</b><p>Verified voting makes up 85% of the final score; performance makes up 15%.</p></div>
        <div><b>National oversight</b><p>Esther Funds Foundation and Pretty Girls Who Serve maintain competition records and review results.</p></div>
      </div>
    </section>

    <section className="section section--blush">
      <div className="section-heading"><div><p className="eyebrow">DONOR FAQ</p><h2>Before you give.</h2></div><p>Plain-language answers for supporters, families, campus communities, and corporate partners.</p></div>
      <div className="faq-grid">
        <details open><summary>Is my vote a donation?</summary><p>Yes. Each eligible vote is a $2.50 contribution processed through the official competition voting form in support of the scholarship competition and mission.</p></details>
        <details><summary>Does a donation go directly to a contestant?</summary><p>No. Votes support the competition and nonprofit mission. Scholarship awards are administered under the published competition rules.</p></details>
        <details><summary>Are voting donations refundable?</summary><p>Voting donations are generally final except where required by law or when the organization determines that a correction is appropriate. Refunded or disputed payments do not count as votes.</p></details>
        <details><summary>Are contributions tax deductible?</summary><p>Tax treatment depends on the nature of the payment and individual circumstances. Keep your receipt and consult a qualified tax professional for guidance.</p></details>
        <details><summary>Why can leaderboard totals change?</summary><p>The public leaderboard is provisional. Totals may change after payment reconciliation, fraud review, refunds, disputes, duplicates, or the final audit.</p></details>
        <details><summary>How can a company become a sponsor?</summary><p>Email {org.competition.contactEmail} to discuss scholarship sponsorship, event partnership, in-kind support, or student-success collaboration.</p></details>
      </div>
    </section>

    <section className="section partnership-panel"><div><p className="eyebrow">CORPORATE PARTNERSHIPS</p><h2>Put your organization behind student success.</h2><p>Partner through scholarship sponsorship, program underwriting, professional development, in-kind contributions, or employee engagement.</p></div><a className="button button--lipstick" href={`mailto:${org.competition.contactEmail}?subject=Miss%20PGWS%202027%20Partnership`}>Request sponsor information</a></section>
    <SiteFooter />
  </main>;
}
