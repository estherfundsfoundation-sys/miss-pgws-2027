"use client";

import { FormEvent, useState } from "react";

type Contestant = { id: string; name: string; college: string };

export function CheckInClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contestant[]>([]);
  const [selected, setSelected] = useState<Contestant | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(""); setSelected(null);
    try {
      const response = await fetch(`/api/queen-training/check-in?q=${encodeURIComponent(query)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Search failed.");
      setResults(body.contestants || []);
      if (!(body.contestants || []).length) setMessage("No accepted contestant matched that name. Try your first or last name.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Search failed."); }
    finally { setBusy(false); }
  }

  async function checkIn(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/queen-training/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contestantId: selected.id, email }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Check-in failed.");
      setComplete(true);
      setMessage(body.already_checked_in ? `Welcome back, ${body.name || selected.name}! Your 10 attendance points are already recorded.` : `Welcome, ${body.name || selected.name}! You earned 10 Queen Training attendance points.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Check-in failed."); }
    finally { setBusy(false); }
  }

  if (complete) return <div className="queen-checkin-success" role="status"><div className="queen-checkin-crown">♛</div><p>WELCOME, SISTER</p><h2>+10 POINTS</h2><strong>{message}</strong><div className="queen-checkin-sparkles">✦ ✧ ✦ ✧ ✦</div></div>;

  return <div className="queen-checkin-card">
    <div className="queen-checkin-heading"><p className="eyebrow">MISS PGWS 2027 · OFFICIAL ATTENDANCE</p><h1>Welcome,<br/><em>Sister.</em></h1><p>Search your name, confirm your application email, and receive your Queen Training attendance points.</p></div>
    <form onSubmit={search} className="queen-checkin-form">
      <label><span>1 · SEARCH YOUR NAME</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter your first or last name" minLength={2} required /></label>
      <button className="button button--lipstick" disabled={busy}>{busy ? "Searching…" : "Find my name"}</button>
    </form>
    {!!results.length && <div className="queen-checkin-results"><p>Choose your name:</p>{results.map((person) => <button key={person.id} type="button" className={selected?.id === person.id ? "is-selected" : ""} onClick={() => { setSelected(person); setMessage(""); }}><strong>{person.name}</strong><span>{person.college}</span></button>)}</div>}
    {selected && <form onSubmit={checkIn} className="queen-checkin-form queen-checkin-confirm"><div className="queen-selected"><span>SELECTED CONTESTANT</span><strong>{selected.name}</strong></div><label><span>2 · CONFIRM YOUR APPLICATION EMAIL</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email used on your application" required /></label><button className="button button--lipstick" disabled={busy}>{busy ? "Checking you in…" : "Check in & receive +10"}</button></form>}
    {message && <p className="queen-checkin-message" role="alert">{message}</p>}
    <p className="queen-checkin-help">Need help? Email <a href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a>.</p>
  </div>;
}
