import type { Metadata } from "next";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { ContestantGallery } from "./ContestantGallery";
export const metadata: Metadata = { title: "Meet the Contestants" };
export default function ContestantsPage(){return <main><SiteHeader compact/><section className="page-hero"><div className="page-hero-inner"><p className="eyebrow">THE 2027 CAST</p><h1>Meet the women behind the mission.</h1><p className="lede">Discover each contestant's story, faith, service, advocacy platform, and official campaign video.</p></div></section><section className="section"><ContestantGallery/></section><SiteFooter/></main>}
