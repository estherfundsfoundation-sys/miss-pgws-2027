import type { Metadata } from "next";
import { Suspense } from "react";
import { SisterCheckInClient } from "./SisterCheckInClient";

export const metadata: Metadata = {
  title: "A Love Note for Our Pretty Sisters",
  description: "A personalized Queen Training check-in from Miss Pretty Girls Who Serve.",
};

export default function SisterCheckInPage() {
  return <Suspense fallback={<main style={{minHeight:"100vh",background:"#f8dce7"}} />}><SisterCheckInClient /></Suspense>;
}
