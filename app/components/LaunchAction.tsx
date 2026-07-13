"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import content from "../../content/application-content.json";
import { rest } from "@/lib/supabase-browser";

type Settings = { applications_open: boolean; voting_open: boolean };

export function LaunchAction({ kind, className = "button button--lipstick" }: { kind: "applications" | "voting"; className?: string }) {
  const [settings, setSettings] = useState<Settings>({ applications_open:false, voting_open:false });
  useEffect(() => { void rest<Settings[]>("pgws_platform_settings?singleton=eq.true&select=applications_open,voting_open&limit=1").then((result) => setSettings(result.data?.[0] ?? { applications_open:false, voting_open:false })); }, []);
  const open = kind === "applications" ? settings.applications_open : settings.voting_open;
  if (open && kind === "applications") return <Link className={className} href="/create-account">Create account & begin</Link>;
  if (open && kind === "voting") return <a className={className} href={content.voting.jotformUrl} target="_blank" rel="noreferrer">Open the official voting form ↗</a>;
  if (kind === "applications") return <a className={className} href={content.meta.urls.interestGroupMe} target="_blank" rel="noreferrer">Join the interest chat ↗</a>;
  return <Link className={className} href="/timeline">See when voting opens</Link>;
}
