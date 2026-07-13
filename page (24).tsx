import type { Metadata } from "next";
import Link from "next/link";
import content from "../../content/application-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "Apply" };

export default function ApplyPage() {
  const priority = content.calendar.dates.find((d) => d.id === "priority-deadline");
  const final = content.calendar.dates.find((d) => d.id === "final-application-deadline");
  return <main>
    <SiteHeader compact />
    <section className="page-hero"><div className="page-hero-inner">
      <p className="eyebrow">APPLICATIONS ARE OPEN</p>
      <h1>Your story belongs in this issue.</h1>
      <p className="lede">Become the next Miss Pretty Girls Who Serve through a faith-centered experience built around identity, service, advocacy, leadership, fundraising, and student success.</p>
      <div className="hero-actions" style={{marginTop:28}}><Link className="button button--lipstick" href="/create-account">Create account & begin</Link><a className="button button--paper" href={content.meta.urls.interestGroupMe} target="_blank" rel="noreferrer">Join the public interest chat ↗</a></div>
    </div></section>
    <section className="section section--paper">
      <div className="section-heading"><div><p className="eyebrow">BEFORE YOU APPLY</p><h2>Know the cover lines.</h2></div><p>Creating an account lets you save a draft, return later, sign the official agreement, upload materials, and track your status without starting over.</p></div>
      <div className="editorial-grid">
        <article className="editorial-card" data-number="18"><h3>18 or older</h3><p>You must be at least 18 by the official application deadline.</p></article>
        <article className="editorial-card" data-number="01"><h3>Currently enrolled</h3><p>You must be enrolled at a college or university. There is no minimum GPA.</p></article>
        <article className="editorial-card editorial-card--accent" data-number="✦"><h3>Christian & faith-centered</h3><p>You must identify as Christian and agree to respect the competition’s faith-centered nature.</p></article>
      </div>
    </section>
    <section className="section">
      <div className="deadline-panel">
        <div className="deadline-copy"><p className="eyebrow">IMPORTANT DATES</p><h2>Apply with time to breathe.</h2><div className="deadline-list"><div className="deadline-item"><b>Priority deadline</b><span>{priority?.display}</span></div><div className="deadline-item"><b>Final deadline</b><span>{final?.display}</span></div><div className="deadline-item"><b>Acceptance notifications</b><span>August 5, 2026</span></div><div className="deadline-item"><b>Queen Training</b><span>August 15, 2026</span></div></div><Link className="button button--ink" href="/timeline" style={{marginTop:24}}>View every date</Link></div>
        <div className="deadline-copy" style={{background:'var(--blush)'}}><p className="eyebrow">YOUR APPLICATION INCLUDES</p><h2>Seven guided sections.</h2><ol>{content.application.sections.map((section)=><li key={section.id} style={{marginBottom:10}}>{section.title}</li>)}</ol><div className="notice" style={{marginTop:24}}><span>◆</span><div>The 42-section agreement is a separate, readable document with 15 required initials and your electronic signature.</div></div></div>
      </div>
    </section>
    <section className="section section--blush" style={{textAlign:'center'}}><p className="eyebrow">READY WHEN YOU ARE</p><h2 className="display-title" style={{fontSize:'clamp(58px,9vw,120px)'}}>Step into the issue.</h2><p className="lede" style={{margin:'24px auto 30px'}}>The public interest chat is open before you apply. The application itself requires a verified account so your private materials stay connected to you.</p><Link className="button button--lipstick" href="/create-account">Create your applicant account</Link></section>
    <SiteFooter />
  </main>;
}
