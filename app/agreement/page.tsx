import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { AgreementDocument } from "./AgreementDocument";

export const metadata: Metadata = { title: "Applicant & Contestant Agreement" };
export default function AgreementPage(){return <main><SiteHeader compact /><section className="page-hero no-print"><div className="page-hero-inner"><p className="eyebrow">OFFICIAL LEGAL DOCUMENT</p><h1>Read every word.</h1><p className="lede">The agreement appears in a clean, accessible document layout with 42 numbered sections, 15 required initials, and a complete electronic-signature record.</p></div></section><section className="page-shell"><AgreementDocument /></section></main>;}
