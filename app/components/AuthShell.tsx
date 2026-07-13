import Image from "next/image";
import { AuthPanel } from "./AuthPanel";

export function AuthShell({mode}:{mode:'login'|'create'|'forgot'|'reset'|'staff'}){return <main className="auth-shell"><section className="auth-art"><Image src="/brand/new-beauty-issue-cover.png" alt="The New Beauty Issue" fill priority sizes="50vw" /><div className="auth-art-copy"><p className="eyebrow eyebrow--light">PROVERBS 31:10</p><h2>“Her price is far above rubies.”</h2></div></section><section className="auth-panel"><AuthPanel mode={mode} /></section></main>;}
