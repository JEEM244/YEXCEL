import test from "node:test";
import assert from "node:assert/strict";
import { buildFoodLogXlsx } from "../js/xlsx-export.js";

const catalog = [
  { id: "desayuno", label: "Desayuno", items: [["Yogurth", "LITROS"], ["Papaya", "PIEZAS"]] },
  { id: "abarrotes", label: "Abarrotes y desechables", items: [["Arroz", "KG"]] }
];

const logs = [
  {
    id: "one", date: "2026-09-01", center: "Casa club: Caminando Juntos", cook: "Cocinera",
    breakfasts: 35, mealsServed: 38, menu: "Filete de pescado", water: "Jamaica", fruit: "Papaya",
    items: [
      { category: "desayuno", description: "Yogurth", quantity: 3, unit: "LITROS" },
      { category: "abarrotes", description: "Arroz", quantity: 1.5, unit: "KG" }
    ]
  },
  {
    id: "two", date: "2026-09-02", center: "Casa club: Caminando Juntos", cook: "Cocinera",
    breakfasts: 39, mealsServed: 35, menu: "Pierna y muslo", water: "Jamaica", fruit: "Papaya",
    items: [
      { category: "desayuno", description: "Yogurth", quantity: 4, unit: "LITROS" },
      { category: "desayuno", description: "Papaya", quantity: 4, unit: "PIEZAS" },
      { category: "otros", description: "Nopal", quantity: 2.5, unit: "KG" }
    ]
  }
];

test("builds a genuine XLSX ZIP package with workbook, styles and two sheets", () => {
  const file = buildFoodLogXlsx(logs, "2026-09", catalog);
  assert.ok(file instanceof Uint8Array);
  assert.deepEqual(Array.from(file.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
  assert.deepEqual(Array.from(file.slice(-22, -18)), [0x50, 0x4b, 0x05, 0x06]);
  const content = new TextDecoder().decode(file);
  assert.ok(content.includes("[Content_Types].xml"));
  assert.ok(content.includes("xl/worksheets/sheet1.xml"));
  assert.ok(content.includes("xl/worksheets/sheet2.xml"));
  assert.ok(content.includes("name=\"Concentrado\""));
  assert.ok(content.includes("name=\"Registros diarios\""));
});

test("concentrado has date columns, unit in description, and automatic totals", () => {
  const content = new TextDecoder().decode(buildFoodLogXlsx(logs, "2026-09", catalog));
  assert.ok(content.includes("Yogurth (LITROS)"));
  assert.ok(content.includes("Papaya (PIEZAS)"));
  assert.ok(content.includes("1.5"));
  assert.ok(content.includes("SUM(B6:C6)"));
  assert.ok(content.includes("Casa club: Caminando Juntos"));
});

test("keeps legacy supplies that do not exist in the fixed catalog", () => {
  const content = new TextDecoder().decode(buildFoodLogXlsx(logs, "2026-09", catalog));
  assert.ok(content.includes("Nopal (KG)"));
  assert.ok(content.includes("2.5"));
});

test("rejects empty log data instead of downloading an empty workbook", () => {
  assert.throws(() => buildFoodLogXlsx([], "2026-09", catalog), /No hay registros/);
});
