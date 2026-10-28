import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseJsonBackup } from "../js/export.js";

const fixture = (name) => readFile(new URL("./fixtures/" + name, import.meta.url), "utf8");

test("accepts the versioned backup fixture", async () => {
  const result = parseJsonBackup(await fixture("valid-backup.json"));
  assert.equal(result.valid, true);
  assert.equal(result.meals.length, 1);
  assert.equal(result.meals[0].food, "Avena con plátano");
});

test("rejects a backup fixture with unsupported version and invalid rows", async () => {
  const result = parseJsonBackup(await fixture("invalid-backup.json"));
  assert.equal(result.valid, false);
});
