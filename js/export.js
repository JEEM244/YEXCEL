import { csvCell, sortMealsNewestFirst } from "./utils.js";
import { normalizeMeals } from "./storage.js";

export const BACKUP_FORMAT = "yexcel-backup";
export const BACKUP_VERSION = 1;

export function buildCsv(meals) {
  const normalized = normalizeMeals(meals);
  if (!normalized.valid) throw new TypeError(normalized.error);
  const rows = [
    ["Fecha", "Tipo de comida", "Comida", "Hora", "Bebida", "Notas"],
    ...sortMealsNewestFirst(normalized.meals).map((meal) => [
      meal.date, meal.type, meal.food, meal.time, meal.drink, meal.notes
    ])
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

export function buildJsonBackup(meals, createdAt = new Date()) {
  const normalized = normalizeMeals(meals);
  if (!normalized.valid) throw new TypeError(normalized.error);
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: createdAt.toISOString(),
    meals: normalized.meals
  }, null, 2);
}

export function parseJsonBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: false, error: "El archivo no contiene JSON válido.", meals: [] };
  }
  if (Array.isArray(parsed)) {
    const legacy = normalizeMeals(parsed);
    return legacy.valid
      ? { valid: true, meals: legacy.meals, warning: "Se detectó un respaldo en formato antiguo." }
      : { valid: false, error: legacy.error, meals: [] };
  }
  if (!parsed || parsed.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION) {
    return { valid: false, error: "El archivo no es un respaldo YEXCEL compatible.", meals: [] };
  }
  const normalized = normalizeMeals(parsed.meals);
  return normalized.valid
    ? { valid: true, meals: normalized.meals, warning: "" }
    : { valid: false, error: normalized.error, meals: [] };
}

export function downloadText(filename, content, mimeType) {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof Blob === "undefined") {
    throw new Error("La descarga solo está disponible en un navegador.");
  }
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Dar al navegador tiempo para comenzar a leer el objeto antes de revocarlo.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
