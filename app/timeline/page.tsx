import type { Metadata } from "next";
import Link from "next/link";
import content from "../../content/application-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "Official Timeline" };

export default function TimelinePage() {
  return (
    <main>
      <SiteHeader compact />
      <section className="page-hero"><div className="page-hero-inner">
        <p className="eyebrow">THE OFFICIAL EDITORIAL CALENDAR</p>
        <h1>The road to the crown.</h1>
        <p className="lede">The 2027 titleholder competition operates in 2026. All public deadlines below are shown in Eastern Time.</p>
      </div></section>
      <section className="page-shell">
        <div className="notice"><span aria-hidden="true">◆</span><div><strong>Save these dates.</strong><br />Portal notices, official email, this calendar, and the signed agreement are the official sources of competition information.</div></div>
        <div className="timeline" style={{ marginTop: 42 }}>
          {content.calendar.dates.map((item) => (
            <article className="timeline-item" key={item.id}>
              <span className="timeline-dot" aria-hidden="true" />
              <div><h3>{item.label}</h3></div>
              <div className="timeline-date">{item.display}</div>
            </article>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 46 }}><Link className="button button--lipstick" href="/apply">Start your application</Link></div>
      </section>
      <SiteFooter />
    </main>
  );
}
