import test from "node:test";
import assert from "node:assert/strict";
import {
  localISODate, parseISODate, formatDateEs, formatMonthEs, escapeHTML, csvCell,
  uniqueDateCount, sortMealsNewestFirst, createId
} from "../js/utils.js";

test("localISODate conserva el día local sin convertir a UTC", () => {
  const date = new Date(2026, 0, 2, 23, 30);
  assert.equal(localISODate(date), "2026-01-02");
});

test("parseISODate acepta fechas reales y rechaza fechas imposibles", () => {
  assert.equal(parseISODate("2024-02-29").getDate(), 29);
  assert.equal(parseISODate("2025-02-29"), null);
  assert.equal(parseISODate("2026-2-03"), null);
});

test("formatDateEs muestra fecha en español", () => {
  assert.equal(formatDateEs("2026-01-02"), "2 de enero de 2026");
  assert.equal(formatDateEs("no-fecha"), "Fecha no válida");
});

test("escapeHTML neutraliza etiquetas y comillas", () => {
  assert.equal(escapeHTML('<img src=x onerror="x">'), "&lt;img src=x onerror=&quot;x&quot;&gt;");
});

test("csvCell escapa comillas y neutraliza fórmulas", () => {
  assert.equal(csvCell('hola "mundo"'), '"hola ""mundo"""');
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell("  @SUM(A1:A2)"), '"\'  @SUM(A1:A2)"');
});

test("uniqueDateCount cuenta fechas, no registros", () => {
  assert.equal(uniqueDateCount([{ date: "2026-01-01" }, { date: "2026-01-01" }, { date: "2026-01-02" }]), 2);
});

test("sortMealsNewestFirst no muta el arreglo original", () => {
  const original = [{ date: "2026-01-01" }, { date: "2026-02-01" }];
  assert.equal(sortMealsNewestFirst(original)[0].date, "2026-02-01");
  assert.equal(original[0].date, "2026-01-01");
});

test("createId genera valores no vacíos", () => {
  assert.ok(createId().length > 5);
});

test("formatMonthEs uses a stable Spanish label", () => {
  assert.equal(formatMonthEs(new Date(2026, 9, 1)), "Octubre 2026");
});

test("parseISODate rejects empty input and non-string values", () => {
  assert.equal(parseISODate(""), null);
  assert.equal(parseISODate(null), null);
  assert.equal(parseISODate("2026-13-01"), null);
});

test("parseISODate keeps years below 100 instead of shifting them to the 1900s", () => {
  assert.equal(parseISODate("0099-12-31").getFullYear(), 99);
});

test("createId produces distinct ids across repeated calls", () => {
  const ids = new Set(Array.from({ length: 200 }, () => createId()));
  assert.equal(ids.size, 200);
});
