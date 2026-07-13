import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://miss-pgws-2027.vercel.app"),
  title: { default: "Miss Pretty Girls Who Serve 2027 | The New Beauty Issue", template: "%s | Miss PGWS 2027" },
  description: "A national, faith-centered scholarship, leadership, service, advocacy, and personal-development competition for Christian college women.",
  openGraph: { title: "Miss Pretty Girls Who Serve 2027 — The New Beauty Issue", description: "This Isn’t About Makeup. This Is About You.", images: ["/brand/new-beauty-issue-cover.png"] },
  twitter: { card: "summary_large_image", title: "Miss Pretty Girls Who Serve 2027", description: "The New Beauty Issue — a crown with a calling.", images: ["/brand/new-beauty-issue-cover.png"] },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
