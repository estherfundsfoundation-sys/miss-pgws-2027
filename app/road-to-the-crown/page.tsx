import type { Metadata } from "next";
import { campaignQuestion } from "@/lib/competition";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { RoadToCrownClient } from "./RoadToCrownClient";

export const metadata: Metadata = {
  title: "Road to the Crown",
  description:
    "The interactive Miss Pretty Girls Who Serve 2027 campaign roadmap, video guide, Contestant Studio walkthrough, and campaign-week planner.",
};

export default function RoadToTheCrownPage() {
  return (
    <main className="crown-roadmap-page">
      <SiteHeader compact />
      <section className="crown-roadmap-hero">
        <div className="crown-roadmap-hero__glow" aria-hidden="true" />
        <div className="crown-roadmap-hero__copy">
          <p className="eyebrow">MISS PGWS 2027 · THE NEW BEAUTY ISSUE</p>
          <p className="crown-roadmap-kicker">Your campaign does not begin with a post. It begins with purpose.</p>
          <h1>The road to<br /><em>the crown.</em></h1>
          <p className="lede">
            Check every milestone, open each training room, and leave knowing exactly what happens next—from Queen Training to the winner announcement.
          </p>
          <div className="hero-actions">
            <a className="button button--paper" href="#meet-your-host">Meet your host</a>
            <a className="button button--lipstick" href="#guided-roadmap">Start the guided walkthrough</a>
            <a className="button button--paper" href="#confidence-walkthrough">Open Confidence Lab</a>
            <a className="button button--paper" href="/portal/campaign">Open my Contestant Studio</a>
          </div>
        </div>
        <div className="crown-roadmap-hero__art" aria-label="Rose-gold crown, pearls, and ruby editorial artwork">
          <img src="/new-beauty-issue-hero.png" alt="" />
          <span className="crown-roadmap-seal">BEAUTY<br />WITH<br />PURPOSE</span>
        </div>
      </section>

      <section className="host-introduction" id="meet-your-host">
        <div className="host-introduction__portrait">
          <div className="host-introduction__portrait-frame">
            <img src="/shayna-vincent-founder.jpg" alt="Shayna Vincent, founder and chief executive officer of Esther Funds Foundation" />
          </div>
          <div className="host-introduction__portrait-caption">
            <span>TAMPA, FLORIDA</span>
            <strong>National vision.<br />A sister’s heart.</strong>
          </div>
        </div>

        <div className="host-introduction__story">
          <p className="eyebrow">MEET YOUR HOST · SHAYNA VINCENT</p>
          <h2>Hi, Pretty Girls.<br /><em>I’ll be your host!</em></h2>
          <p className="host-introduction__welcome">I’ve hosted every EFF and PGWS pageant experience alongside our queens. But today, I’m not standing before you only as a director. I’m here as a teacher, guide, and sister who knows what it feels like to search for worth.</p>

          <div className="host-introduction__roles" aria-label="Shayna Vincent’s roles">
            <span>School Teacher</span><span>Founder & CEO</span><span>Published Author</span><span>Ministry Leader</span>
          </div>

          <div className="host-testimony">
            <p className="eyebrow eyebrow--light">MY TESTIMONY</p>
            <blockquote>“Growing up as a plus-size Black girl in predominantly white neighborhoods and spaces, I struggled with depression, anxiety, and believing I was worthy. I sometimes searched for worth in relationships, alcohol, sex, and places that could never tell me who I was in Christ.”</blockquote>
            <p>I did not know what a Proverbs 31 woman was until God revealed her to me at age 23. That revelation changed the direction of my life. Now, I help women discover their beauty, identity, and purpose in Christ through faith, honest conversation, sisterhood, service, and beautiful spaces where we can gather.</p>
          </div>
        </div>

        <div className="host-accomplishments">
          <div className="host-accomplishments__heading">
            <p className="eyebrow">WHAT I CARRY INTO THIS ROOM</p>
            <h3>Purpose built<br />through perseverance.</h3>
          </div>
          <div className="host-accomplishments__grid">
            <article><span>01</span><strong>Founder & Chief Executive Officer</strong><p>Esther Funds Foundation—a Christ-centered national nonprofit helping college students persist to graduation.</p></article>
            <article><span>02</span><strong>Founder of Pretty Girls Who Serve</strong><p>Created because young women asked for a real sisterhood rooted in Jesus, fellowship, beauty, and service.</p></article>
            <article><span>03</span><strong>Educator & Published Author</strong><p>A school teacher committed to equity, access, faith, and helping students believe in their future.</p></article>
            <article><span>04</span><strong>Florida A&M University Graduate</strong><p>Earned a Bachelor of Science in Elementary Education after a college journey shaped by resilience.</p></article>
            <article><span>05</span><strong>Hillsborough Community College Alumna</strong><p>A proud Tampa native whose own educational path became part of her purpose.</p></article>
            <article><span>06</span><strong>Sigma Gamma Rho Woman</strong><p>A dedicated member of Sigma Gamma Rho Sorority, Incorporated, carrying leadership, service, and scholarship.</p></article>
            <article><span>07</span><strong>College-Retention Advocate</strong><p>Leads scholarship, emergency-aid, student-resource, chapter, and national dropout-prevention efforts.</p></article>
            <article><span>08</span><strong>Pageant Host & Queen Mentor</strong><p>Has guided EFF and PGWS competition experiences alongside national queens and growing sisterhood cohorts.</p></article>
          </div>
        </div>

        <div className="host-vision">
          <div><p className="eyebrow eyebrow--light">WHY I’M HERE</p><h3>This sisterhood does not end when the crown is placed.</h3></div>
          <p>My goal is to know you beyond this pageant, help more PGWS chapters rise across the nation, and plant Pretty Girls Who Serve at universities everywhere. More women deserve to know what it means to become a Proverbs 31 woman and find their beauty in Christ.</p>
          <div className="host-vision__chat"><span>YOUR FIRST MOVE</span><strong>Drop a 👑 in the chat and say,<br />“Hi, Ms. Shayna!”</strong></div>
        </div>
      </section>

      <RoadToCrownClient campaignQuestion={campaignQuestion} />
      <SiteFooter />
    </main>
  );
}
