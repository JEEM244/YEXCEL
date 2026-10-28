export const MEAL_TYPES = Object.freeze([
  "Desayuno", "Colación", "Comida", "Merienda", "Cena", "Otro"
]);

export const MONTHS_ES = Object.freeze([
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]);

export function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function formatDateEs(value) {
  const date = parseISODate(value);
  if (!date) return "Fecha no válida";
  return `${date.getDate()} de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()}`;
}

export function formatMonthEs(date) {
  return `${MONTHS_ES[date.getMonth()][0].toUpperCase()}${MONTHS_ES[date.getMonth()].slice(1)} ${date.getFullYear()}`;
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `meal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function uniqueDateCount(meals) {
  return new Set(meals.map((meal) => meal.date)).size;
}

export function sortMealsNewestFirst(meals) {
  return [...meals].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "")
  );
}

export function csvCell(value) {
  let text = String(value ?? "");
  // Neutraliza fórmulas potenciales en programas de hoja de cálculo.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
