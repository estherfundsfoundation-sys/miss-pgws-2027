import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function secureMatch(left: string | null, right: string | undefined) {
  const first = Buffer.from(String(left || ""));
  const second = Buffer.from(String(right || ""));
  return first.length > 0 && first.length === second.length && timingSafeEqual(first, second);
}

function clean(value: unknown, maximum: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > maximum) throw new Error("The email payload is invalid.");
  return text;
}

export async function POST(request: NextRequest) {
  try {
    if (!secureMatch(request.headers.get("x-pgws-mail-bridge-secret"), process.env.PGWS_MAIL_BRIDGE_SECRET))
      return NextResponse.json({ error: "Authorized mail bridge access is required." }, { status: 401 });
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("The Miss PGWS email sender is not configured.");
    const input = await request.json().catch(() => ({}));
    const recipient = clean(input.recipient, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("The recipient is invalid.");
    const subject = clean(input.subject, 180);
    const text = clean(input.text, 40_000);
    const html = clean(input.html, 100_000);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "Esther Funds Foundation <notifications@estherfundsinc.org>",
          to: [recipient],
          reply_to: "nationals@estherfundsinc.org",
          subject,
          text,
          html,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return NextResponse.json({ id: body.id, status: "sent" });
      if (response.status !== 429 || attempt === 3)
        throw new Error(body?.message ?? "The email provider rejected the message.");
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
    throw new Error("The email provider did not accept the message.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The acceptance email could not be sent." },
      { status: 400 },
    );
  }
}
