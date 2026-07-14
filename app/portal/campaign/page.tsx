import { CampaignProfileEditor } from './CampaignProfileEditor';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader';
export default function CampaignProfilePage(){return <main><SiteHeader compact/><section className="page-hero page-hero--compact"><div className="page-hero-inner"><p className="eyebrow">CONTESTANT WORKSPACE</p><h1>Build your public campaign profile.</h1><p className="lede">Tell donors who you are, share your platform, and upload your official campaign video. Nothing appears publicly until competition staff approves it.</p></div></section><section className="section"><CampaignProfileEditor/></section><SiteFooter/></main>}
