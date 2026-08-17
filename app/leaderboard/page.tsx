import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import content from "../../content/application-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { LaunchAction } from "../components/LaunchAction";
import { LeaderboardClient } from "./LeaderboardClient";

export const metadata: Metadata = { title: "Live Leaderboard" };

export default function LeaderboardPage() {
  return <main>
    <SiteHeader compact />
    <section className="leaderboard-hero"><div className="leaderboard-hero__copy"><p className="eyebrow eyebrow--light">LIVE · VERIFIED · PROVISIONAL</p><h1>The road to <em>the crown.</em></h1><p>Follow the official Miss PGWS 2027 rankings as completed, eligible payments are verified. Every profile, vote, and rank remains connected to the official competition record.</p><div className="hero-actions"><LaunchAction kind="voting"/><Link className="button button--paper" href="/contestants">Meet all contestants</Link></div></div><div className="leaderboard-hero__brand"><Image src="/brand/miss-pgws-2027-logo.png" alt="Miss Pretty Girls Who Serve 2027" width={520} height={520} priority /></div></section>
    <section className="page-shell">
      <div className="notice"><span>◆</span><div><strong>Official voting window</strong><br />{content.calendar.dates.find(d=>d.id==='voting-opens')?.display} through {content.calendar.dates.find(d=>d.id==='voting-closes')?.display}. Only successfully paid and verified votes appear in the live totals.</div></div>
      <LeaderboardClient />
      <div className="center-actions"><LaunchAction kind="voting"/><Link className="button button--paper" href="/contestants">Open contestant profiles</Link><Link className="button button--ink" href="/donor-center">Voting and donor terms</Link></div>
    </section>
    <SiteFooter />
  </main>;
}
