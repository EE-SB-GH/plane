/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type JsonValue = JsonObject | JsonValue[] | string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };

const packageRoot = path.resolve(import.meta.dirname, "..");
const localeRoot = path.join(packageRoot, "src/locales");
const sourceRoot = path.join(localeRoot, "en");

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectKeys(value: JsonValue, prefix = ""): Set<string> {
  if (!isJsonObject(value)) return new Set(prefix ? [prefix] : []);
  const keys = new Set<string>();
  for (const [key, child] of Object.entries(value)) {
    for (const nestedKey of collectKeys(child, prefix ? `${prefix}.${key}` : key)) keys.add(nestedKey);
  }
  return keys;
}

async function readLocaleKeys(directory: string): Promise<Set<string>> {
  const keys = new Set<string>();
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
  for (const file of files) {
    const content = await readFile(path.join(directory, file), "utf8");
    for (const key of collectKeys(JSON.parse(content) as JsonValue)) keys.add(key);
  }
  return keys;
}

const sourceKeys = await readLocaleKeys(sourceRoot);
const languages = (await readdir(localeRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== "en")
  .map((entry) => entry.name)
  .sort();
const failures: string[] = [];

for (const language of languages) {
  const localeKeys = await readLocaleKeys(path.join(localeRoot, language));
  const missing = [...sourceKeys].filter((key) => !localeKeys.has(key));
  if (missing.length > 0) failures.push(`${language}: ${missing.length} missing keys`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
