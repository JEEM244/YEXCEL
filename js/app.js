import {
  MEAL_TYPES, MONTHS_ES, createId, escapeHTML, formatDateEs, formatMonthEs,
  localISODate, parseISODate, sortMealsNewestFirst, uniqueDateCount
} from "./utils.js";
import { loadMeals, saveMeals, validateMeal } from "./storage.js";
import { buildCsv, buildJsonBackup, downloadText, parseJsonBackup } from "./export.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const today = localISODate();
let cursor = new Date();
cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
let selectedDate = today;
let editingId = null;
let returnFocus = null;
let toastTimer = null;

const loaded = loadMeals();
let meals = loaded.ok ? loaded.meals : [];
if (loaded.ok && loaded.migrated) {
  const migrationSave = saveMeals(meals);
  if (!migrationSave.ok) loaded.warning = migrationSave.error;
}

function toast(message, kind = "status") {
  const node = $("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("error", kind === "error");
  node.setAttribute("role", kind === "error" ? "alert" : "status");
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 3600);
}

function persist(nextMeals, message = "Cambios guardados en este navegador.") {
  const result = saveMeals(nextMeals);
  if (!result.ok) {
    toast(result.error, "error");
    return false;
  }
  meals = result.meals;
  render();
  toast(message);
  return true;
}

function openView(name) {
  $$(".view").forEach((section) => {
    section.classList.toggle("active", section.id === "view-" + name);
  });
  $$("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === name);
    if (button.dataset.view === name) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const labels = {
    inicio: ["Tu espacio personal", "Panel de control"],
    registro: ["Organiza tus comidas", "Registro diario"],
    historial: ["Todos tus datos", "Historial"],
    exportar: ["Tus datos organizados", "Exportar a Excel"]
  };
  const label = labels[name] || labels.inicio;
  $("#kicker").textContent = label[0];
  $("#title").textContent = label[1];
  render();
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

$$("[data-view]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.view)));
$$("[data-goto]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.goto)));

function openForm(id = null) {
  returnFocus = document.activeElement;
  editingId = id;
  const meal = meals.find((item) => item.id === id);
  $("#form").reset();
  $("#date").value = meal ? meal.date : selectedDate;
  $("#type").value = meal ? meal.type : "Desayuno";
  $("#food").value = meal ? meal.food : "";
  $("#time").value = meal ? meal.time : "";
  $("#drink").value = meal ? meal.drink : "";
  $("#notes").value = meal ? meal.notes : "";
  $(".modalhead h2").textContent = meal ? "Editar registro" : "Nuevo registro";
  $("#submitMeal").textContent = meal ? "Guardar cambios" : "Guardar registro";
  $("#modalback").classList.add("open");
  $("#modalback").setAttribute("aria-hidden", "false");
  setTimeout(() => $("#food").focus(), 30);
}

function closeForm() {
  $("#modalback").classList.remove("open");
  $("#modalback").setAttribute("aria-hidden", "true");
  editingId = null;
  if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
}

$("#addMain").addEventListener("click", () => openForm());
$("#openForm").addEventListener("click", () => openForm());
$("#close").addEventListener("click", closeForm);
$("#cancel").addEventListener("click", closeForm);
$("#modalback").addEventListener("click", (event) => {
  if (event.target === $("#modalback")) closeForm();
});
document.addEventListener("keydown", (event) => {
  if (!$("#modalback").classList.contains("open")) return;
  if (event.key === "Escape") {
    closeForm();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = Array.from($("#form").querySelectorAll(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
  )).filter((element) => !element.hidden && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

$("#form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = {
    id: editingId || createId(),
    date: $("#date").value,
    type: $("#type").value,
    food: $("#food").value,
    time: $("#time").value,
    drink: $("#drink").value,
    notes: $("#notes").value
  };
  const validation = validateMeal(input);
  if (!validation.valid) {
    toast(validation.error, "error");
    return;
  }
  const next = editingId
    ? meals.map((item) => item.id === editingId ? validation.meal : item)
    : meals.concat(validation.meal);
  selectedDate = validation.meal.date;
  const date = parseISODate(selectedDate);
  cursor = new Date(date.getFullYear(), date.getMonth(), 1);
  if (persist(next, editingId ? "Registro actualizado." : "Registro guardado.")) {
    closeForm();
    openView("registro");
  }
});

function recordsMarkup(items, dateForEmpty = selectedDate) {
  if (!items.length) {
    return '<div class="empty"><div class="emptyicon" aria-hidden="true">＋</div><h4>Sin registros por ahora</h4><p>Agrega una comida para empezar a organizar esta fecha.</p><button class="primary addempty" type="button" data-date="' + escapeHTML(dateForEmpty) + '">＋ Agregar comida</button></div>';
  }
  return '<div class="records">' + items.map((meal) => {
    const meta = [meal.type, meal.time, meal.drink].filter(Boolean).map(escapeHTML).join(" · ");
    const notes = meal.notes ? '<small class="record-note">' + escapeHTML(meal.notes) + '</small>' : "";
    return '<article class="record"><div class="record-copy"><strong>' + escapeHTML(meal.food) +
      '</strong><small>' + meta + '</small>' + notes + '</div><div class="record-actions">' +
      '<span class="tag">' + escapeHTML(meal.type) + '</span>' +
      '<button class="secondary edit" type="button" data-id="' + escapeHTML(meal.id) + '" aria-label="Editar ' + escapeHTML(meal.food) + '">Editar</button>' +
      '<button class="secondary del" type="button" data-id="' + escapeHTML(meal.id) + '" aria-label="Eliminar ' + escapeHTML(meal.food) + '">×</button>' +
      '</div></article>';
  }).join("") + "</div>";
}

function wireRecordButtons(root) {
  root.querySelectorAll(".addempty").forEach((button) => button.addEventListener("click", () => {
    selectedDate = button.dataset.date || selectedDate;
    const date = parseISODate(selectedDate);
    if (date) cursor = new Date(date.getFullYear(), date.getMonth(), 1);
    calendar();
    $("#selectedLabel").textContent = formatDateEs(selectedDate);
    $("#selectedCount").textContent = listForDate(selectedDate).length + " registros";
    openForm();
  }));
  root.querySelectorAll(".edit").forEach((button) => button.addEventListener("click", () => openForm(button.dataset.id)));
  root.querySelectorAll(".del").forEach((button) => button.addEventListener("click", () => {
    const meal = meals.find((item) => item.id === button.dataset.id);
    if (!meal || !window.confirm('¿Eliminar el registro "' + meal.food + '"?')) return;
    persist(meals.filter((item) => item.id !== meal.id), "Registro eliminado.");
  }));
}

function renderList(node, items, dateForEmpty = selectedDate) {
  node.innerHTML = recordsMarkup(items, dateForEmpty);
  wireRecordButtons(node);
}

function calendar() {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  $("#monthLabel").textContent = formatMonthEs(cursor);
  const dayButtons = [];
  for (let index = 0; index < 42; index += 1) {
    let number;
    let dateValue;
    let dim = false;
    if (index < offset) {
      number = previousDays - offset + index + 1;
      dateValue = localISODate(new Date(year, month - 1, number));
      dim = true;
    } else if (index >= offset + daysInMonth) {
      number = index - offset - daysInMonth + 1;
      dateValue = localISODate(new Date(year, month + 1, number));
      dim = true;
    } else {
      number = index - offset + 1;
      dateValue = localISODate(new Date(year, month, number));
    }
    const classes = ["day"];
    if (dim) classes.push("dim");
    if (dateValue === today) classes.push("today");
    if (dateValue === selectedDate) classes.push("selected");
    if (meals.some((item) => item.date === dateValue)) classes.push("has");
    dayButtons.push('<button class="' + classes.join(" ") + '" type="button" data-date="' + dateValue +
      '" aria-label="' + escapeHTML(formatDateEs(dateValue)) + '" aria-pressed="' + String(dateValue === selectedDate) + '">' +
      number + '</button>');
  }
  $("#days").innerHTML = dayButtons.join("");
  $("#days").querySelectorAll("[data-date]").forEach((button) => button.addEventListener("click", () => {
    selectedDate = button.dataset.date;
    const date = parseISODate(selectedDate);
    cursor = new Date(date.getFullYear(), date.getMonth(), 1);
    render();
  }));
  $("#selectedLabel").textContent = formatDateEs(selectedDate);
  $("#selectedCount").textContent = listForDate(selectedDate).length + " registros";
}

function listForDate(date) {
  return meals.filter((meal) => meal.date === date).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function renderHistory() {
  const query = $("#search").value.trim().toLocaleLowerCase("es-MX");
  const type = $("#filter").value;
  const from = $("#fromDate")?.value || "";
  const to = $("#toDate")?.value || "";
  const filtered = sortMealsNewestFirst(meals).filter((meal) => {
    const searchable = [meal.food, meal.notes, meal.drink, meal.type, meal.date].join(" ").toLocaleLowerCase("es-MX");
    return (!query || searchable.includes(query)) &&
      (!type || meal.type === type) && (!from || meal.date >= from) && (!to || meal.date <= to);
  });
  $("#historyCount").textContent = filtered.length + " registros";
  renderList($("#historyRecords"), filtered);
}

$("#search").addEventListener("input", renderHistory);
$("#filter").addEventListener("change", renderHistory);
$("#fromDate")?.addEventListener("change", renderHistory);
$("#toDate")?.addEventListener("change", renderHistory);

$("#clearFilters")?.addEventListener("click", () => {
  $("#search").value = "";
  $("#filter").value = "";
  if ($("#fromDate")) $("#fromDate").value = "";
  if ($("#toDate")) $("#toDate").value = "";
  renderHistory();
  toast("Filtros limpiados.");
});
$("#prev").addEventListener("click", () => {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  calendar();
});
$("#next").addEventListener("click", () => {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  calendar();
});

$("#download").addEventListener("click", () => {
  if (!meals.length) {
    toast("No hay registros para exportar todavía.", "error");
    return;
  }
  try {
    downloadText("yexcel-registros.csv", buildCsv(meals), "text/csv;charset=utf-8");
    toast("CSV descargado; puedes abrirlo en Excel.");
  } catch (error) {
    toast(error.message || "No se pudo crear el CSV.", "error");
  }
});

$("#downloadBackup")?.addEventListener("click", () => {
  if (!meals.length) {
    toast("No hay registros para respaldar todavía.", "error");
    return;
  }
  try {
    downloadText("yexcel-respaldo.json", buildJsonBackup(meals), "application/json;charset=utf-8");
    toast("Respaldo JSON descargado. Guárdalo en un lugar privado.");
  } catch (error) {
    toast(error.message || "No se pudo crear el respaldo.", "error");
  }
});

$("#importBackup")?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > 2_000_000) {
    toast("El respaldo supera el límite de 2 MB.", "error");
    return;
  }
  try {
    const parsed = parseJsonBackup(await file.text());
    if (!parsed.valid) {
      toast(parsed.error, "error");
      return;
    }
    const prompt = "Se reemplazarán los " + meals.length + " registros actuales por " +
      parsed.meals.length + " registros del respaldo. ¿Continuar?";
    if (!window.confirm(prompt)) return;
    if (persist(parsed.meals, "Respaldo restaurado.")) {
      selectedDate = parsed.meals[0]?.date || today;
      const date = parseISODate(selectedDate);
      cursor = new Date(date.getFullYear(), date.getMonth(), 1);
      render();
      if (parsed.warning) toast(parsed.warning);
    }
  } catch {
    toast("No se pudo leer el archivo de respaldo.", "error");
  }
});

function render() {
  const todaysMeals = listForDate(today);
  const selectedMeals = listForDate(selectedDate);
  const monthPrefix = today.slice(0, 7);
  $("#statDays").textContent = String(uniqueDateCount(meals)).padStart(2, "0");
  $("#statMeals").textContent = String(meals.length).padStart(2, "0");
  $("#statMonth").textContent = String(meals.filter((meal) => meal.date.startsWith(monthPrefix)).length).padStart(2, "0");
  $("#todayLabel").textContent = formatDateEs(today);
  renderList($("#todayRecords"), todaysMeals, today);
  renderList($("#selectedRecords"), selectedMeals, selectedDate);
  $("#formDateLabel").textContent = formatDateEs(selectedDate);
  $("#dayCount").textContent = String(selectedMeals.length);
  $("#progress").style.width = Math.min(100, selectedMeals.length * 20) + "%";
  $("#exportMeals").textContent = String(meals.length).padStart(2, "0");
  $("#exportDays").textContent = String(uniqueDateCount(meals)).padStart(2, "0");
  calendar();
  renderHistory();
}

if (!loaded.ok) toast(loaded.error + " No se mostraron los registros dañados.", "error");
else if (loaded.warning) toast(loaded.warning, "error");
render();
