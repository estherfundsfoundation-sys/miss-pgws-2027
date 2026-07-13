import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <p className="eyebrow eyebrow--light">PRETTY GIRLS WHO SERVE · ESTHER FUNDS FOUNDATION</p>
        <h2>Beauty. Redefined.<br />Chosen. Crowned.</h2>
      </div>
      <div className="footer-links">
        <Link href="/apply">Apply</Link>
        <Link href="/timeline">Timeline</Link>
        <Link href="/login">Applicant login</Link>
        <Link href="/admin/login">Staff login</Link>
        <a href="mailto:nationals@estherfundsinc.org">Contact</a>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Pretty Girls Who Serve · Every Future Fulfilled.</p>
        <p>Proverbs 31:10 · “Her price is far above rubies.”</p>
      </div>
    </footer>
  );
}
