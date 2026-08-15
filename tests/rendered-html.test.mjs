import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("uses the supported Next.js and Vercel foundation", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("package.json", root), "utf8"),
  );

  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  assert.equal(packageJson.dependencies.next, "16.2.6");
  assert.equal(packageJson.dependencies.react, "19.2.6");

  for (const legacyDependency of [
    "@cloudflare/vite-plugin",
    "vinext",
    "vite",
    "wrangler",
  ]) {
    assert.equal(packageJson.devDependencies?.[legacyDependency], undefined);
  }
});

test("keeps deployment secrets out of public configuration", async () => {
  const [gitignore, envExample] = await Promise.all([
    readFile(new URL(".gitignore", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);

  assert.match(gitignore, /^\.env\*/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(envExample, /^NEXT_PUBLIC_SUPABASE_URL=$/m);
  assert.match(envExample, /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$/m);
  assert.match(envExample, /^SUPABASE_SECRET_KEY=$/m);
  assert.match(envExample, /^JOTFORM_API_KEY=$/m);
  assert.doesNotMatch(envExample, /=\S+/);
});

test("includes the application shell and supplied brand assets", async () => {
  const requiredPaths = [
    "app/layout.tsx",
    "app/page.tsx",
    "app/globals.css",
    "public/favicon.svg",
    "public/brand/competition-brand-foundations.png",
    "public/brand/new-beauty-issue-cover.png",
    "public/brand/pgws-logo.png",
    "public/brand/pgws-parent-brand-kit.jpg",
  ];

  await Promise.all(requiredPaths.map((file) => access(new URL(file, root))));
});

test("includes the complete vote education and donor support experience", async () => {
  const source = await readFile(
    new URL("app/road-to-the-crown/RoadToCrownClient.tsx", root),
    "utf8",
  );

  for (const requiredCopy of [
    "VOTES STILL NEEDED",
    "VOTE BUNDLES EXPLAINED",
    "DONOR RELATIONSHIPS",
    "RECEIPTS & VOTE CONFIRMATION",
    "nationals@estherfundsinc.org",
    "tax-deductible to the extent allowed by law",
  ]) {
    assert.match(source, new RegExp(requiredCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("includes the Studio finish state and connected platform generator", async () => {
  const [studio, roadmap] = await Promise.all([
    readFile(new URL("app/portal/campaign/CampaignProfileEditor.tsx", root), "utf8"),
    readFile(new URL("app/road-to-the-crown/RoadToCrownClient.tsx", root), "utf8"),
  ]);

  for (const requiredCopy of [
    "STUDIO COMPLETE",
    "Finish & publish my Studio",
    "Platform Points Generator draft followed you here",
  ]) {
    assert.match(studio, new RegExp(requiredCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const requiredCopy of [
    "THE PLATFORM POINTS GENERATOR",
    "Generate my platform points",
    "YOUR PERSONALIZED CAMPAIGN-WEEK IDEAS",
    "Send this plan to my Studio",
    "THE NATIONAL WINNER EXPERIENCE",
    "$1,000–$2,500 First-Place Scholarship",
    "A Foundation-Sponsored Brunch in Her Honor",
    "EVERY CONTESTANT RECEIVES",
    "Fundraising Impact Letter",
  ]) {
    assert.match(roadmap, new RegExp(requiredCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
