import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import org from "../../content/organization-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "The Queen Archives" };

export default function QueenArchivesPage() {
  return <main>
    <SiteHeader compact />
    <section className="archive-hero">
      <div>
        <p className="eyebrow">THE QUEEN ARCHIVES · VOLUME I</p>
        <h1>Every reign leaves a <em>legacy.</em></h1>
        <p className="lede">A living, magazine-style record of the women who carried the crown through faith, scholarship, sisterhood, leadership, and service.</p>
      </div>
      <Image src="/queens/queens-coronation-group.jpeg" alt="Pretty Girls Who Serve queens and honorees" width={1365} height={2048} priority />
    </section>

    <section className="section section--paper">
      <div className="archive-edition"><span>THE INAUGURAL CLASS</span><b>2026</b><span>WHERE THE LEGACY BEGAN</span></div>
      <div className="queen-features">
        {org.queens.map((queen, index) => <article className={`queen-feature queen-feature--${index + 1}`} key={queen.name}>
          <div className="queen-photo"><Image src={queen.image} alt={`${queen.name}, ${queen.title}`} fill sizes="(max-width: 900px) 100vw, 48vw" /></div>
          <div className="queen-story">
            <p className="eyebrow">CROWNED IN PURPOSE</p>
            <span className="queen-number">0{index + 1}</span>
            <h2>{queen.name}</h2>
            <h3>{queen.title}</h3>
            <blockquote>“{queen.highlight}”</blockquote>
            <p>Her reign reminds every future contestant that a title is not simply worn—it is used to open doors, build community, and serve with intention.</p>
          </div>
        </article>)}
      </div>
    </section>

    <section className="section archive-gallery-section">
      <div className="section-heading"><div><p className="eyebrow">MOMENTS FROM THE REIGN</p><h2>Sisterhood in the frame.</h2></div><p>The crown belongs to one woman for a season, but its impact is built in community.</p></div>
      <div className="archive-gallery">
        <Image src="/queens/mikayla-ware-orange-wide.jpeg" alt="Mikayla Ware in her orange formal gown" width={1920} height={1080} />
        <Image src="/queens/queens-pink-coronation.jpeg" alt="Pretty Girls Who Serve coronation celebration" width={1178} height={2048} />
        <Image src="/queens/queens-celebration.jpeg" alt="Pretty Girls Who Serve sisterhood celebration" width={1280} height={960} />
      </div>
      <div className="center-actions"><Link className="button button--lipstick" href="/apply">Begin your own chapter</Link></div>
    </section>
    <SiteFooter />
  </main>;
}
