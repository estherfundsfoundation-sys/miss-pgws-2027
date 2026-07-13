import type { Metadata } from "next";
import content from "../../content/application-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "Live Leaderboard" };
const demo = [
  { name: "Contestant profiles publish August 22", school: "Official entries will appear here", votes: "—" },
  { name: "Voting opens August 27", school: "Verified donations only", votes: "—" },
  { name: "Final audit September 4", school: "Crowning follows September 5", votes: "—" },
];

export default function LeaderboardPage() {
  return <main>
    <SiteHeader compact />
    <section className="page-hero"><div className="page-hero-inner"><p className="eyebrow">LIVE · VERIFIED · PROVISIONAL</p><h1>The leaderboard.</h1><p className="lede">Rankings will update from verified voting records during the official voting window. Displayed totals remain provisional until the final audit.</p></div></section>
    <section className="page-shell">
      <div className="notice"><span>◆</span><div><strong>Voting is not open yet.</strong><br />{content.calendar.dates.find(d=>d.id==='voting-opens')?.display} through {content.calendar.dates.find(d=>d.id==='voting-closes')?.display}.</div></div>
      <div className="leaderboard-list">
        {demo.map((item,index)=><article className="leader-row" key={item.name}><div className="leader-rank">{index+1}</div><div className="leader-name"><strong>{item.name}</strong><span>{item.school}</span></div><div className="leader-votes"><strong>{item.votes}</strong><span>verified votes</span></div></article>)}
      </div>
      <div style={{textAlign:'center',marginTop:36}}><a className="button button--lipstick" href={content.voting.jotformUrl} target="_blank" rel="noreferrer">Official vote form ↗</a></div>
    </section>
    <SiteFooter />
  </main>;
}
