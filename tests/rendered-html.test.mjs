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

test("uses code-only national staff login while preserving role authorization", async () => {
  const [authPanel, browserAuth, codeRoute, adminClient, migration] = await Promise.all([
    readFile(new URL("app/components/AuthPanel.tsx", root), "utf8"),
    readFile(new URL("lib/supabase-browser.ts", root), "utf8"),
    readFile(new URL("app/api/admin/auth/code/route.ts", root), "utf8"),
    readFile(new URL("app/admin/AdminClient.tsx", root), "utf8"),
    readFile(new URL("supabase/migrations/006_admin_passwordless_login.sql", root), "utf8"),
  ]);

  assert.match(authPanel, /No password is needed/);
  assert.match(authPanel, /autoComplete="one-time-code"/);
  assert.match(authPanel, /Verify code and sign in/);
  assert.match(browserAuth, /type:"email"/);

  assert.match(codeRoute, /nationals@estherfundsinc\.org/);
  assert.match(codeRoute, /SUPABASE_SECRET_KEY/);
  assert.match(codeRoute, /pgws_admin_login_requests/);
  for (const role of ["reviewer", "competition_admin", "finance_admin", "super_admin"]) {
    assert.match(codeRoute, new RegExp(role));
  }
  assert.match(adminClient, /pgws_user_roles/);
  assert.match(adminClient, /active=eq\.true/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /No OTP values are stored/);
});
