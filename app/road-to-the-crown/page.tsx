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
            <a className="button button--lipstick" href="#guided-roadmap">Start the guided walkthrough</a>
            <a className="button button--paper" href="/portal/campaign">Open my Contestant Studio</a>
          </div>
        </div>
        <div className="crown-roadmap-hero__art" aria-label="Rose-gold crown, pearls, and ruby editorial artwork">
          <img src="/new-beauty-issue-hero.png" alt="" />
          <span className="crown-roadmap-seal">BEAUTY<br />WITH<br />PURPOSE</span>
        </div>
      </section>

      <RoadToCrownClient campaignQuestion={campaignQuestion} />
      <SiteFooter />
    </main>
  );
}
