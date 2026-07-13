import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const warnings = [];

const requiredFiles = [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "public/favicon.svg",
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    errors.push(`Missing required file: ${relativePath}`);
  }
}

const [major = 0, minor = 0] = process.versions.node
  .split(".")
  .map((part) => Number.parseInt(part, 10));

if (major < 22 || (major === 22 && minor < 13)) {
  errors.push(
    `Node ${process.versions.node} is too old. This project requires Node 22.13 or newer.`,
  );
}

const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");

if (fs.existsSync(packagePath) && fs.existsSync(lockPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const packageLock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const lockRoot = packageLock.packages?.[""] ?? {};

  for (const section of ["dependencies", "devDependencies"]) {
    const declared = packageJson[section] ?? {};
    const locked = lockRoot[section] ?? {};
    const names = new Set([...Object.keys(declared), ...Object.keys(locked)]);

    for (const name of names) {
      if (declared[name] !== locked[name]) {
        errors.push(
          `Lock mismatch for ${section}.${name}: package.json=${declared[name] ?? "missing"}, package-lock.json=${locked[name] ?? "missing"}`,
        );
      }
    }
  }

  if (packageJson.scripts?.build !== "next build") {
    errors.push("The production build command must remain `next build` for Vercel.");
  }
}

const gitignorePath = path.join(root, ".gitignore");
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, "utf8");
  if (!/^\.env\*/m.test(gitignore)) {
    errors.push(".gitignore must ignore .env files so credentials are not committed.");
  }
}

const publicBrandPath = path.join(root, "public", "brand");
if (!fs.existsSync(publicBrandPath)) {
  warnings.push("No public/brand directory exists yet.");
} else {
  const brandAssets = fs
    .readdirSync(publicBrandPath, { withFileTypes: true })
    .filter((entry) => entry.isFile());
  if (brandAssets.length === 0) {
    warnings.push("public/brand exists but contains no assets.");
  }
}

const nodeModulesPath = path.join(root, "node_modules");
const nextCliPath = path.join(nodeModulesPath, ".bin", "next.cmd");
if (!fs.existsSync(nextCliPath)) {
  warnings.push(
    "Dependencies are not installed in this sandbox. Run `npm ci` in an environment with npm registry access (Vercel does this during deployment).",
  );
}

const clientRoots = ["app", "public"];
const forbiddenSecretNames = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JOTFORM_API_KEY",
  "RESEND_API_KEY",
];

for (const clientRoot of clientRoots) {
  const absoluteRoot = path.join(root, clientRoot);
  if (!fs.existsSync(absoluteRoot)) continue;

  const pending = [absoluteRoot];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
        continue;
      }

      if (!/\.(?:[cm]?[jt]sx?|json|html|css)$/i.test(entry.name)) continue;
      const source = fs.readFileSync(absolutePath, "utf8");
      const relativePath = path.relative(root, absolutePath);
      const isPublicAsset = relativePath.startsWith(`public${path.sep}`);
      const isClientModule = /^\s*["']use client["'];?/m.test(source);
      if (!isPublicAsset && !isClientModule) continue;

      for (const secretName of forbiddenSecretNames) {
        if (source.includes(secretName)) {
          errors.push(
            `${relativePath} references server-only ${secretName}. Move it to a server route and read it from process.env there.`,
          );
        }
      }
    }
  }
}

console.log("Miss PGWS 2027 foundation check");
console.log(`Node: ${process.versions.node}`);
console.log(`Project: ${root}`);

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

if (errors.length > 0) {
  console.error(`Foundation check failed with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log("Foundation check passed.");
}
