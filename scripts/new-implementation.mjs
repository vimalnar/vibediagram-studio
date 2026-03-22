#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const TEMPLATE_PATH = path.join(
  ROOT_DIR,
  "scripts/templates/implementation.impl.tsx.tpl",
);
const IMPLEMENTATIONS_DIR = path.join(ROOT_DIR, "src/implementations");
const REGISTRY_PATH = path.join(IMPLEMENTATIONS_DIR, "index.ts");

const usage = `Usage:
  npm run new:implementation -- --id entropy
  npm run new:implementation -- entropy "Entropy in 3D"
  npm run new:implementation -- --title "Entropy in 3D"
Options:
  --id <slug>      Implementation id (letters, numbers, dashes)
  --title <title>  Human-readable title
  --force          Overwrite existing file if present
  --help           Show this help message
`;

const toSlug = (input) => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const toTitle = (slug) => {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const toPascal = (slug) => {
  const titled = toTitle(slug).replace(/[^A-Za-z0-9]/g, "");
  return titled.length > 0 ? titled : "Generated";
};

const toCamel = (slug) => {
  const pascal = toPascal(slug);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const parseArgs = (argv) => {
  const parsed = {
    id: "",
    title: "",
    force: false,
    help: false,
  };
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--force") {
      parsed.force = true;
      continue;
    }
    if (arg === "--id") {
      parsed.id = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--title") {
      parsed.title = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    positionals.push(arg);
  }

  if (!parsed.id && positionals[0]) {
    parsed.id = positionals[0];
  }
  if (!parsed.title && positionals[1]) {
    parsed.title = positionals.slice(1).join(" ");
  }

  return parsed;
};

const findObjectLiteralClose = (source, objectDeclarationStart) => {
  const openBraceIndex = source.indexOf("{", objectDeclarationStart);
  if (openBraceIndex < 0) {
    return -1;
  }

  let depth = 0;
  for (let i = openBraceIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
};

const registerImplementation = async ({ id, constName }) => {
  let registry = await fs.readFile(REGISTRY_PATH, "utf8");

  const importLine = `import { ${constName} } from "./${id}.impl";`;
  if (!registry.includes(importLine)) {
    const imports = [...registry.matchAll(/^import .*;$/gm)];
    if (imports.length === 0) {
      registry = `${importLine}\n${registry}`;
    } else {
      const lastImport = imports[imports.length - 1];
      const insertAt = (lastImport.index ?? 0) + lastImport[0].length;
      registry =
        registry.slice(0, insertAt) + `\n${importLine}` + registry.slice(insertAt);
    }
  }

  const keyMarker = `"${id}":`;
  if (!registry.includes(keyMarker)) {
    const implObjectStart = registry.indexOf("const implementations:");
    if (implObjectStart < 0) {
      throw new Error("Could not find implementations registry object.");
    }
    const implObjectClose = findObjectLiteralClose(registry, implObjectStart);
    if (implObjectClose < 0) {
      throw new Error("Could not parse implementations registry object.");
    }
    const entryLine = `  "${id}": ${constName},\n`;
    registry =
      registry.slice(0, implObjectClose) +
      entryLine +
      registry.slice(implObjectClose);
  }

  await fs.writeFile(REGISTRY_PATH, registry);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage);
    return;
  }

  const derivedId = toSlug(args.id || args.title);
  if (!derivedId) {
    console.error("Error: provide --id or --title to generate an implementation.");
    console.error(usage);
    process.exitCode = 1;
    return;
  }
  if (!/^[a-z0-9-]+$/.test(derivedId)) {
    console.error("Error: id must contain only lowercase letters, numbers, and dashes.");
    process.exitCode = 1;
    return;
  }

  const title = (args.title || toTitle(derivedId)).trim();
  const pascalName = toPascal(derivedId);
  const constName = `${toCamel(derivedId)}Implementation`;
  const projectId = `${pascalName}Explainer`;
  const targetFile = path.join(IMPLEMENTATIONS_DIR, `${derivedId}.impl.tsx`);

  let existing = false;
  try {
    await fs.stat(targetFile);
    existing = true;
  } catch {
    existing = false;
  }

  if (existing && !args.force) {
    console.error(
      `Error: ${path.relative(ROOT_DIR, targetFile)} already exists. Use --force to overwrite.`,
    );
    process.exitCode = 1;
    return;
  }

  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  const source = template
    .replaceAll("__ID__", derivedId)
    .replaceAll("__TITLE__", title)
    .replaceAll("__CONST__", constName)
    .replaceAll("__PASCAL__", pascalName)
    .replaceAll("__PROJECT_ID__", projectId);

  await fs.writeFile(targetFile, source);
  await registerImplementation({ id: derivedId, constName });

  console.log(`Created ${path.relative(ROOT_DIR, targetFile)}`);
  console.log(`Registered "${derivedId}" in ${path.relative(ROOT_DIR, REGISTRY_PATH)}`);
  console.log(
    `Next: run npm run lint && npm run build, then open with ?implementation=${derivedId}`,
  );
};

await main();
