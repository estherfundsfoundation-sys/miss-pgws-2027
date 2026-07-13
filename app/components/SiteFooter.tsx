import Image from "next/image";
import Link from "next/link";
import org from "../../content/organization-content.json";

const quickLinks = [
  ["Home", "/"], ["Apply", "/apply"], ["Timeline", "/timeline"],
  ["Meet Contestants", "/contestants"], ["Vote", "/vote"],
  ["Live Leaderboard", "/leaderboard"], ["Donor Center", "/donor-center"],
  ["Queen Archives", "/queen-archives"], ["Contact", "/contact"],
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-intro">
        <p className="eyebrow eyebrow--light">A CROWN WITH A CALLING</p>
        <h2>Beauty. Redefined.<br />Chosen. Crowned.</h2>
        <p>A national scholarship competition where faith, leadership, service, sisterhood, and student success share the spotlight.</p>
      </div>

      <div className="footer-directory">
        <section className="footer-organization">
          <Image src={org.prettyGirlsWhoServe.logo} alt="Pretty Girls Who Serve" width={110} height={110} />
          <div><h3>Pretty Girls Who Serve</h3><p>Faith · Sisterhood · Leadership · Scholarship</p></div>
          <a href={org.prettyGirlsWhoServe.website} target="_blank" rel="noreferrer">Official website ↗</a>
          <a href={org.prettyGirlsWhoServe.instagramUrl} target="_blank" rel="noreferrer">{org.prettyGirlsWhoServe.instagramHandle} ↗</a>
        </section>

        <nav className="footer-quick-links" aria-label="Footer navigation">
          <h3>Quick Links</h3>
          {quickLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>

        <section className="footer-organization footer-organization--eff">
          <Image src={org.estherFundsFoundation.logo} alt="Esther Funds Foundation" width={110} height={110} />
          <div><h3>Esther Funds Foundation</h3><p>{org.estherFundsFoundation.designation}</p><p><strong>EIN: {org.estherFundsFoundation.ein}</strong></p></div>
          <a href={org.estherFundsFoundation.website} target="_blank" rel="noreferrer">Official website ↗</a>
          <a href={org.estherFundsFoundation.instagramUrl} target="_blank" rel="noreferrer">{org.estherFundsFoundation.instagramHandle} ↗</a>
        </section>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Pretty Girls Who Serve · Presented in support of Esther Funds Foundation.</p>
        <p>Proverbs 31:10 · “Her price is far above rubies.”</p>
        <Link href="/admin/login">National staff access</Link>
      </div>
    </footer>
  );
}
