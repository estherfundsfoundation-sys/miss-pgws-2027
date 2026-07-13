import Image from "next/image";
import Link from "next/link";
import content from "../content/application-content.json";
import org from "../content/organization-content.json";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { LaunchAction } from "./components/LaunchAction";

const featuredDates = ["applications-open", "priority-deadline", "final-application-deadline", "queen-training-and-official-onboarding"];

export default function Home() {
  const dates = content.calendar.dates.filter((item) => featuredDates.includes(item.id));
  return <main>
    <SiteHeader />
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">MISS PRETTY GIRLS WHO SERVE · CLASS OF 2027</p>
        <h1>The New <span>Beauty Issue</span></h1>
        <p className="hero-tagline">This Isn’t About Makeup. This Is About You.</p>
        <p className="hero-description">{content.publicCopy.coreMessage}</p>
        <div className="hero-actions"><Link className="button button--lipstick" href="/apply">Become the next Miss PGWS</Link><a className="button button--paper" href={content.meta.urls.interestGroupMe} target="_blank" rel="noreferrer">Join the interest chat ↗</a></div>
      </div>
      <div className="hero-art"><Image src="/brand/new-beauty-issue-cover.png" alt="Miss Pretty Girls Who Serve 2027 — The New Beauty Issue" fill priority sizes="(max-width: 1040px) 100vw, 45vw" /></div>
      <span className="hero-ruby" aria-hidden="true" />
    </section>

    <div className="ticker" aria-label="Competition pillars">{["Faith", "Sisterhood", "Leadership", "Scholarship", "Service", "Purpose"].map((item) => <span key={item}>{item}</span>)}</div>

    <section className="home-trust">
      <div className="home-trust-brand"><Image src={org.prettyGirlsWhoServe.logo} alt="Pretty Girls Who Serve" width={92} height={92} /><div><span>Presented by</span><strong>Pretty Girls Who Serve</strong><a href={org.prettyGirlsWhoServe.instagramUrl} target="_blank" rel="noreferrer">{org.prettyGirlsWhoServe.instagramHandle}</a></div></div>
      <div className="home-trust-divider">+</div>
      <div className="home-trust-brand"><Image src={org.estherFundsFoundation.logo} alt="Esther Funds Foundation" width={92} height={92} /><div><span>In support of</span><strong>Esther Funds Foundation</strong><a href={org.estherFundsFoundation.website} target="_blank" rel="noreferrer">Faith-Based 501(c)(3) · EIN {org.estherFundsFoundation.ein}</a></div></div>
    </section>

    <section className="section section--paper">
      <div className="section-heading"><div><p className="eyebrow">THE COVER STORY</p><h2>A different kind of crown.</h2></div><p>{content.publicCopy.competitionDescription} This national scholarship experience makes room for a woman’s faith, service, story, leadership, and commitment to helping other students persist through college.</p></div>
      <div className="editorial-grid"><article className="editorial-card" data-number="01"><p className="eyebrow">IDENTITY</p><h3>Rooted in Christ</h3><p>Explore beauty and worth through faith, dignity, wisdom, and character—not one worldly standard.</p></article><article className="editorial-card editorial-card--accent" data-number="02"><p className="eyebrow eyebrow--light">IMPACT</p><h3>Service with purpose</h3><p>Build an advocacy platform connected to service, student success, belonging, and college-dropout prevention.</p></article><article className="editorial-card" data-number="03"><p className="eyebrow">LEADERSHIP</p><h3>A title that works</h3><p>Train, campaign, lead, communicate, and carry the mission forward as a visible servant-leader.</p></article></div>
    </section>

    <section className="queens-home">
      <div className="queens-home-heading"><p className="eyebrow">MEET OUR QUEENS</p><h2>The women who made history first.</h2><p>Two inaugural titleholders. Two distinct legacies. One shared commitment to service, sisterhood, and student impact.</p><Link className="text-link text-link--arrow" href="/queen-archives">Enter the Queen Archives →</Link></div>
      <div className="queens-home-grid">
        {org.queens.map((queen, index) => <article className="queen-home-card" key={queen.name}><div className="queen-home-image"><Image src={queen.image} alt={`${queen.name}, ${queen.title}`} fill sizes="(max-width: 850px) 100vw, 38vw" /></div><span>2026 TITLEHOLDER · 0{index + 1}</span><h3>{queen.name}</h3><p>{queen.title}</p><blockquote>{queen.highlight}</blockquote></article>)}
      </div>
    </section>

    <section className="scripture-strip"><blockquote>“{content.signatureScripture.text}”</blockquote><cite>{content.signatureScripture.reference} · {content.signatureScripture.translation}</cite></section>

    <section className="section section--blush"><div className="deadline-panel"><div className="deadline-copy"><p className="eyebrow">THE 2027 ISSUE · OPERATING IN 2026</p><h2>Your moment starts now.</h2><p className="lede">Applications are open to eligible Christian college women. Create your account, complete the official application, upload your materials, and sign the Contestant Agreement.</p><div className="deadline-list">{dates.map((item) => <div className="deadline-item" key={item.id}><b>{item.label}</b><span>{item.display}</span></div>)}</div><div className="hero-actions" style={{ marginTop: 28 }}><LaunchAction kind="applications"/><Link className="button button--paper" href="/timeline">Full timeline</Link></div></div><div className="deadline-art"><Image src="/brand/miss-pgws-2027-logo.png" alt="Official Miss Pretty Girls Who Serve 2027 logo" width={1536} height={1536} sizes="(max-width: 1040px) 100vw, 45vw" /></div></div></section>

    <section className="section section--ink">
      <div className="section-heading"><div><p className="eyebrow eyebrow--light">SCHOLARSHIP & FUNDRAISING</p><h2>Votes create impact.</h2></div><p>{content.publicCopy.scholarshipAndFundraisingMessage}</p></div>
      <div className="editorial-grid"><article className="editorial-card"><p className="eyebrow">FIRST PLACE</p><h3>Miss Pretty Girls Who Serve</h3><p>10% of verified gross voting donations before processing fees, with a $1,000 minimum and $2,500 maximum.</p></article><article className="editorial-card"><p className="eyebrow">SECOND PLACE</p><h3>Miss Pretty Girls University</h3><p>A $500 scholarship and campus-centered title. An optional $250 third-place award may be activated before voting.</p></article><article className="editorial-card editorial-card--accent"><p className="eyebrow eyebrow--light">SCORING</p><h3>85% votes · 15% performance</h3><p>Each verified vote is a $2.50 donation. Final placement is confirmed only after the official audit.</p></article></div>
      <div className="center-actions center-actions--dark"><Link className="button button--paper" href="/donor-center">Explore the Donor Center</Link><Link className="button button--lipstick" href="/vote">Vote with purpose</Link></div>
    </section>
    <section className="eff-home-feature"><div><Image src={org.estherFundsFoundation.logo} alt="Esther Funds Foundation" width={190} height={190} /></div><div><p className="eyebrow">THE NONPROFIT BEHIND THE MISSION</p><h2>More than a competition.</h2><p>Esther Funds Foundation is a faith-based 501(c)(3) nonprofit organization advancing college-dropout prevention, scholarships, leadership development, and student success.</p><div className="hero-actions"><Link className="button button--ink" href="/about-esther-funds">Learn about EFF</Link><a className="button button--paper" href={org.estherFundsFoundation.website} target="_blank" rel="noreferrer">Official foundation website ↗</a></div></div><aside><span>IRS PUBLIC CHARITY</span><strong>EIN</strong><b>{org.estherFundsFoundation.ein}</b></aside></section>
    <SiteFooter />
  </main>;
}
