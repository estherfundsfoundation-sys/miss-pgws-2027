import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "Meet the Contestants" };

export default function ContestantsPage() {
  return <main><SiteHeader compact /><section className="page-hero"><div className="page-hero-inner"><p className="eyebrow">THE 2027 CAST</p><h1>Meet the women behind the mission.</h1><p className="lede">Official contestant profiles will publish after eligibility review, agreements, onboarding, and the public contestant announcement.</p></div></section><section className="section contestant-coming-soon"><div><span>COMING NEXT</span><h2>Every profile will tell a fuller story.</h2><p>Meet each contestant through her campus, advocacy platform, service record, faith, leadership journey, and vision for the crown—not just a photograph.</p><div className="hero-actions"><Link className="button button--lipstick" href="/timeline">See the announcement timeline</Link><Link className="button button--paper" href="/apply">Apply for the 2027 class</Link></div></div></section><SiteFooter /></main>;
}
