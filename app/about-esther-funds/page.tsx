import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import org from "../../content/organization-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "About Esther Funds Foundation" };

const work = [
  ["College Dropout Prevention", "Practical resources, support, and programming designed to help students persist through barriers and continue toward graduation."],
  ["Scholarships", "Direct educational investment that helps students meet costs and remain focused on their college journey."],
  ["Leadership Development", "Training and experiences that prepare students to lead with integrity, service, excellence, and faith."],
  ["REACH Program", "A college-centered community and resource experience that strengthens connection, opportunity, and student success."],
  ["Campus Chapters", "Student-led communities that translate the national mission into service, support, and leadership on campus."],
  ["Student Success", "A whole-student approach that recognizes academic, financial, social, personal, and spiritual dimensions of persistence."],
];

export default function AboutEstherFundsPage() {
  return <main>
    <SiteHeader compact />
    <section className="eff-hero">
      <Image src={org.estherFundsFoundation.logo} alt="Esther Funds Foundation" width={310} height={310} priority />
      <div><p className="eyebrow">EVERY FUTURE FULFILLED</p><h1>Helping students stay, succeed, and graduate.</h1><p className="lede">Esther Funds Foundation is a faith-based nonprofit organization committed to college-dropout prevention, scholarships, leadership development, student belonging, and practical pathways toward educational success.</p><div className="hero-actions"><a className="button button--ink" href={org.estherFundsFoundation.website} target="_blank" rel="noreferrer">Visit the official EFF website ↗</a><Link className="button button--paper" href="/donor-center">See donor impact</Link></div></div>
    </section>
    <section className="nonprofit-seal"><strong>Esther Funds Foundation</strong><span>{org.estherFundsFoundation.designation}</span><b>EIN: {org.estherFundsFoundation.ein}</b></section>

    <section className="section section--paper">
      <div className="mission-vision-grid"><article><p className="eyebrow">OUR MISSION</p><h2>Every future fulfilled.</h2><p>EFF works to reduce barriers that can interrupt a student’s education and surrounds students with resources, leadership opportunities, service, scholarships, and community.</p></article><article><p className="eyebrow">OUR VISION</p><h2>A future students can finish.</h2><p>We envision college communities where students have the support, confidence, connection, and opportunity they need to persist, graduate, and lead lives of purpose.</p></article></div>
    </section>

    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">HOW THE MISSION MOVES</p><h2>Support across the student journey.</h2></div><p>The foundation’s work connects prevention, direct support, leadership, belonging, and service instead of treating student success as a single issue.</p></div>
      <div className="work-grid">{work.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="section section--ink collaboration-story"><div><p className="eyebrow eyebrow--light">WHY EFF + PGWS</p><h2>A competition connected to a larger mission.</h2></div><div><p>Pretty Girls Who Serve creates a faith-centered space for sisterhood, leadership, scholarship, and service. Esther Funds Foundation provides the nonprofit mission and student-success foundation that gives this competition its deeper purpose.</p><p>Together, they create an experience where a crown becomes a platform for advocacy, community, fundraising, and college persistence.</p><Link className="button button--paper" href="/queen-archives">Meet the queens carrying the mission</Link></div></section>
    <section className="section support-ways"><p className="eyebrow">WAYS TO SUPPORT</p><h2>Give. Partner. Share. Serve.</h2><div className="hero-actions"><Link className="button button--lipstick" href="/vote">Support through voting</Link><a className="button button--ink" href={org.estherFundsFoundation.website} target="_blank" rel="noreferrer">Explore Esther Funds Foundation ↗</a><a className="button button--paper" href={`mailto:${org.competition.contactEmail}`}>Start a partnership</a></div></section>
    <SiteFooter />
  </main>;
}
