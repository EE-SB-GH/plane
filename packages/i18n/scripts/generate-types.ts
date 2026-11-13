/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type JsonValue = JsonObject | JsonValue[] | string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };

const packageRoot = path.resolve(import.meta.dirname, "..");
const localeRoot = path.join(packageRoot, "src/locales/en");
const outputPath = path.join(packageRoot, "src/types/keys.generated.ts");

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectKeys(value: JsonValue, prefix = ""): string[] {
  if (!isJsonObject(value)) return prefix ? [prefix] : [];

  return Object.entries(value).flatMap(([key, child]) => collectKeys(child, prefix ? `${prefix}.${key}` : key));
}

const files = (await readdir(localeRoot)).filter((file) => file.endsWith(".json")).sort();
const keys = new Set<string>();

for (const file of files) {
  const content = await readFile(path.join(localeRoot, file), "utf8");
  for (const key of collectKeys(JSON.parse(content) as JsonValue)) keys.add(key);
}

const values = [...keys].sort().map((key) => `  | ${JSON.stringify(key)}`).join("\n");
const output = `/**\n * Copyright (c) 2023-present Plane Software, Inc. and contributors\n * SPDX-License-Identifier: AGPL-3.0-only\n * See the LICENSE file for details.\n */\n\nexport type TTranslationKeys =\n${values};\n`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);
