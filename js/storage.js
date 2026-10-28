import { MEAL_TYPES, createId, parseISODate } from "./utils.js";

export const STORAGE_KEY = "yexcelMealsV2";
export const LEGACY_STORAGE_KEY = "yexcelMealsV1";
export const MAX_RECORDS = 10000;
const MAX_FOOD = 120;
const MAX_DRINK = 80;
const MAX_NOTES = 400;

export function validateMeal(input, { createMissingId = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "El registro no tiene un formato válido." };
  }
  const date = typeof input.date === "string" ? input.date : "";
  const type = typeof input.type === "string" ? input.type : "";
  const food = typeof input.food === "string" ? input.food.trim() : "";
  const time = typeof input.time === "string" ? input.time : "";
  const drink = typeof input.drink === "string" ? input.drink.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (!parseISODate(date)) return { valid: false, error: "Selecciona una fecha válida." };
  if (!MEAL_TYPES.includes(type)) return { valid: false, error: "Selecciona un tipo de comida válido." };
  if (!food) return { valid: false, error: "Escribe qué comiste." };
  if (food.length > MAX_FOOD || drink.length > MAX_DRINK || notes.length > MAX_NOTES) {
    return { valid: false, error: "Uno de los campos supera el límite permitido." };
  }
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { valid: false, error: "La hora no tiene un formato válido." };
  }
  const id = typeof input.id === "string" && input.id.trim()
    ? input.id.trim()
    : (createMissingId ? createId() : "");
  if (!id) return { valid: false, error: "El registro necesita un identificador." };
  return { valid: true, meal: { id, date, type, food, time, drink, notes } };
}

export function normalizeMeals(value) {
  if (!Array.isArray(value)) return { valid: false, meals: [], error: "El respaldo debe contener una lista de registros." };
  if (value.length > MAX_RECORDS) return { valid: false, meals: [], error: `No se admiten más de ${MAX_RECORDS} registros.` };
  const meals = [];
  const ids = new Set();
  for (const item of value) {
    const result = validateMeal(item, { createMissingId: true });
    if (!result.valid) return { valid: false, meals: [], error: result.error };
    if (ids.has(result.meal.id)) result.meal.id = createId();
    ids.add(result.meal.id);
    meals.push(result.meal);
  }
  return { valid: true, meals, error: "" };
}

export function loadMeals(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) throw new Error("Storage is unavailable");
    let raw = target.getItem(STORAGE_KEY);
    let usedLegacy = false;
    if (raw == null) {
      raw = target.getItem(LEGACY_STORAGE_KEY);
      usedLegacy = raw != null;
    }
    if (raw == null) return { ok: true, meals: [], migrated: false };
    const normalized = normalizeMeals(JSON.parse(raw));
    if (!normalized.valid) {
      return { ok: false, meals: [], error: normalized.error, recovered: true };
    }
    if (usedLegacy) {
      try {
        target.setItem(STORAGE_KEY, JSON.stringify(normalized.meals));
      } catch {
        return {
          ok: true,
          meals: normalized.meals,
          migrated: false,
          warning: "Se recuperaron los registros antiguos, pero no se pudo crear su copia nueva."
        };
      }
    }
    return { ok: true, meals: normalized.meals, migrated: usedLegacy };
  } catch {
    return { ok: false, meals: [], error: "No se pudieron leer los datos del navegador.", recovered: false };
  }
}

export function saveMeals(meals, storage) {
  const normalized = normalizeMeals(meals);
  if (!normalized.valid) return { ok: false, error: normalized.error };
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) throw new Error("Storage is unavailable");
    target.setItem(STORAGE_KEY, JSON.stringify(normalized.meals));
    return { ok: true, meals: normalized.meals };
  } catch {
    return { ok: false, error: "El navegador no pudo guardar los datos. Exporta un respaldo y revisa el espacio disponible." };
  }
}
