import type { Metadata } from "next";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { ContestantGallery } from "./ContestantGallery";
export const metadata: Metadata = { title: "Meet the Contestants" };
export default function ContestantsPage(){return <main><SiteHeader compact/><section className="page-hero contestant-page-hero"><div className="page-hero-inner"><p className="eyebrow">THE NEW BEAUTY ISSUE · 2027</p><h1>Meet the women<br/>behind the mission.</h1><p className="lede">Every contestant carries a story, a calling, and a platform. Meet the women redefining beauty through faith, leadership, sisterhood, and service.</p><div className="contestant-hero-tags"><span>FAITH</span><span>PURPOSE</span><span>SISTERHOOD</span><span>SERVICE</span></div></div></section><section className="section contestant-directory-section"><ContestantGallery/></section><SiteFooter/></main>}
