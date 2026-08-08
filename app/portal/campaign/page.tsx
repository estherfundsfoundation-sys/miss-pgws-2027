import { CampaignProfileEditor } from "./CampaignProfileEditor";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export default function CampaignProfilePage() {
  return <main>
    <SiteHeader compact />
    <section className="page-hero page-hero--compact new-beauty-portal-hero"><div className="page-hero-inner"><p className="eyebrow">THE NEW BEAUTY ISSUE · CONTESTANT STUDIO</p><h1>Find your pretty. Publish your purpose.</h1><p className="lede">Build your official campaign profile, submit your video, follow your points, and share the story God placed in you.</p></div></section>
    <section className="section"><CampaignProfileEditor /></section>
    <SiteFooter />
  </main>;
}
