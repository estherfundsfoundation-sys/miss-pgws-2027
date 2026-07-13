import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { ApplicationForm } from "./ApplicationForm";

export const metadata: Metadata = { title: "Official Application" };
export default function ApplicationPage(){ return <main><SiteHeader compact /><section className="page-hero"><div className="page-hero-inner"><p className="eyebrow">OFFICIAL APPLICANT PORTAL</p><h1>Your application.</h1><p className="lede">Seven guided sections, one secure record, and space to tell your story with honesty and confidence.</p></div></section><section className="page-shell"><ApplicationForm /></section></main>; }
