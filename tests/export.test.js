import test from "node:test";
import assert from "node:assert/strict";
import { buildCsv, buildJsonBackup, parseJsonBackup } from "../js/export.js";

const meals = [{ id: "abc", date: "2026-10-27", type: "Comida", food: "Arroz; pollo", time: "13:00", drink: "Agua", notes: 'dijo "hola"' }];

test("buildCsv includes BOM, Excel-friendly separator and escaped fields", () => {
  const csv = buildCsv(meals);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("Fecha;Tipo de comida;Comida;Hora;Bebida;Notas"));
  assert.ok(csv.includes('"Arroz; pollo"'));
  assert.ok(csv.includes('"dijo ""hola"""'));
});
test("buildJsonBackup stores format, version and records", () => {
  const backup = JSON.parse(buildJsonBackup(meals, new Date("2026-10-27T12:00:00.000Z")));
  assert.equal(backup.format, "yexcel-backup");
  assert.equal(backup.version, 1);
  assert.equal(backup.meals[0].id, "abc");
});
test("parseJsonBackup round-trips a valid backup", () => {
  const result = parseJsonBackup(buildJsonBackup(meals));
  assert.equal(result.valid, true);
  assert.equal(result.meals[0].food, "Arroz; pollo");
});
test("parseJsonBackup rejects invalid or unsupported files", () => {
  assert.equal(parseJsonBackup("{").valid, false);
  assert.equal(parseJsonBackup('{"format":"other","version":3,"meals":[]}').valid, false);
});
