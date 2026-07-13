import type { Metadata } from "next";
import Link from "next/link";
import org from "../../content/organization-content.json";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return <main><SiteHeader compact /><section className="page-hero"><div className="page-hero-inner"><p className="eyebrow">CONTACT NATIONAL LEADERSHIP</p><h1>We’re here to help.</h1><p className="lede">Questions about applying, agreements, voting, donations, partnerships, accessibility, or the competition experience are welcome.</p></div></section><section className="section contact-grid"><article><p className="eyebrow">COMPETITION SUPPORT</p><h2>{org.competition.contactEmail}</h2><p>For application, account, agreement, voting, donor, sponsorship, media, and general competition questions.</p><a className="button button--lipstick" href={`mailto:${org.competition.contactEmail}`}>Email national leadership</a></article><article><p className="eyebrow">EXPLORE THE ORGANIZATIONS</p><h2>Stay connected.</h2><p><a href={org.prettyGirlsWhoServe.instagramUrl} target="_blank" rel="noreferrer">{org.prettyGirlsWhoServe.instagramHandle} ↗</a></p><p><a href={org.estherFundsFoundation.instagramUrl} target="_blank" rel="noreferrer">{org.estherFundsFoundation.instagramHandle} ↗</a></p><p><a href={org.estherFundsFoundation.website} target="_blank" rel="noreferrer">Esther Funds Foundation website ↗</a></p><Link href="/help-signing-in">Account and sign-in help →</Link></article></section><SiteFooter /></main>;
}
