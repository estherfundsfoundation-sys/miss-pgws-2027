import type { Metadata } from "next";
import { CheckInClient } from "./CheckInClient";

export const metadata: Metadata = { title: "Queen Training Check-In · Miss PGWS 2027", description: "Official Miss PGWS 2027 Queen Training attendance check-in." };

export default function QueenTrainingCheckInPage() {
  return <main className="queen-checkin-page"><div className="queen-checkin-orb queen-checkin-orb--one"/><div className="queen-checkin-orb queen-checkin-orb--two"/><CheckInClient /></main>;
}
