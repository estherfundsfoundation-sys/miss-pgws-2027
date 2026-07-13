import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import content from "../../content/application-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "About The New Beauty Issue" };

export default function AboutPage() {
  return <main>
    <SiteHeader compact />
    <section className="page-hero"><div className="page-hero-inner">
      <p className="eyebrow">THE NEW BEAUTY ISSUE</p>
      <h1>Beauty was never one look.</h1>
      <p className="lede">{content.publicCopy.coreMessage}</p>
    </div></section>
    <section className="section section--paper">
      <div className="deadline-panel">
        <div className="deadline-copy">
          <p className="eyebrow">OUR PURPOSE</p>
          <h2>Faith. Voice. Service. Future.</h2>
          <p>{content.publicCopy.competitionDescription}</p>
          <p>{content.publicCopy.notIntendedToJudge}</p>
          <Link className="button button--lipstick" href="/apply">See if you’re eligible</Link>
        </div>
        <div className="deadline-art"><Image src="/brand/pgws-logo.png" alt="Pretty Girls Who Serve by Esther Funds Foundation" width={1024} height={1024} /></div>
      </div>
    </section>
    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">WHAT WE STRENGTHEN</p><h2>The whole woman.</h2></div><p>This experience is designed around identity, confidence, leadership, sisterhood, purpose, service, and student persistence.</p></div>
      <div className="editorial-grid">
        {content.publicCopy.strengthens.map((item, index) => <article className="editorial-card" data-number={String(index + 1).padStart(2,'0')} key={item}><h3>{item}</h3><p>Developed through guided training, reflection, community, campaigning, and meaningful action.</p></article>)}
      </div>
    </section>
    <SiteFooter />
  </main>;
}
