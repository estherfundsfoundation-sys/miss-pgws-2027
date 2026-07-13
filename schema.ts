import Link from "next/link";

const publicLinks = [
  ["The issue", "/about"],
  ["Timeline", "/timeline"],
  ["Scholarships", "/scholarships"],
  ["Leaderboard", "/leaderboard"],
];

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link className="wordmark" href="/" aria-label="Miss Pretty Girls Who Serve home">
        <span className="wordmark-mark" aria-hidden="true">✦</span>
        <span><b>MISS PRETTY GIRLS WHO SERVE</b><small>THE NEW BEAUTY ISSUE · 2027</small></span>
      </Link>
      <nav className="main-nav" aria-label="Primary navigation">
        {publicLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <div className="header-actions">
        <Link className="text-link" href="/login">Sign in</Link>
        <Link className="button button--ink button--small" href="/apply">Apply now</Link>
      </div>
    </header>
  );
}
