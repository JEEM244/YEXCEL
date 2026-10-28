const KEY = "yexcelFoodLogsV1";
const CATEGORIES = [
  { id: "desayuno", label: "Desayuno" },
  { id: "fruta", label: "Fruta y verdura" },
  { id: "abarrotes", label: "Abarrotes y desechables" },
  { id: "carnes", label: "Carnes y carnes frías" }
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const uid = () => globalThis.crypto?.randomUUID?.() || `log-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const dateLabel = value => {
  if (!value) return "Sin fecha";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("es-MX", { day:"numeric", month:"long", year:"numeric" });
};
const numberValue = value => value === "" || value == null ? "" : Number(value);
let logs = load();
let editingId = null;

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter(item => item && typeof item.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Array.isArray(item.items)) : [];
  } catch { return []; }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(logs));
    $("#storageState").textContent = "Guardado en este navegador";
    render();
    return true;
  } catch {
    notify("No se pudieron guardar los datos. Descarga un respaldo y libera espacio del navegador.", true);
    return false;
  }
}
let toastTimer;
function notify(message, error = false) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.toggle("error", error);
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 3500);
}
function categoryMarkup(category, items = []) {
  const rows = items.length ? items : [{ description:"", quantity:"", unit:"" }];
  return `<section class="item-group" data-category="${category.id}">
    <div class="group-heading"><h3>${category.label}</h3><button class="button subtle add-line" type="button">+ Agregar insumo</button></div>
    <div class="line-list">${rows.map(lineMarkup).join("")}</div>
  </section>`;
}
function lineMarkup(item = {}) {
  return `<div class="line-row">
    <label><span>Descripción</span><input class="line-description" maxlength="100" value="${escapeHTML(item.description || "")}" placeholder="Nombre del insumo"></label>
    <label><span>Cantidad</span><input class="line-quantity" type="number" min="0" max="100000000" step="any" value="${item.quantity ?? ""}" placeholder="0"></label>
    <label><span>Unidad</span><input class="line-unit" maxlength="30" value="${escapeHTML(item.unit || "")}" placeholder="KG, piezas, litros..."></label>
    <button class="remove-line" type="button" aria-label="Quitar insumo">×</button>
  </div>`;
}
function clearForm() {
  editingId = null;
  $("#logForm").reset();
  $("#date").value = todayISO();
  $("#center").value = "Casa club: Caminando Juntos";
  $("#itemGroups").innerHTML = CATEGORIES.map(category => categoryMarkup(category)).join("");
  $("#formHeading").textContent = "Nuevo registro de alimentos";
  $("#saveLog").textContent = "Guardar registro";
}
function getFormData() {
  const items = [];
  $$(".item-group").forEach(group => {
    $$(".line-row", group).forEach(row => {
      const description = $(".line-description", row).value.trim();
      const quantityRaw = $(".line-quantity", row).value;
      const unit = $(".line-unit", row).value.trim();
      if (!description && quantityRaw === "" && !unit) return;
      items.push({
        category: group.dataset.category,
        description,
        quantity: numberValue(quantityRaw),
        unit
      });
    });
  });
  return {
    id: editingId || uid(),
    date: $("#date").value,
    center: $("#center").value.trim(),
    cook: $("#cook").value.trim(),
    breakfasts: numberValue($("#breakfasts").value),
    mealsServed: numberValue($("#mealsServed").value),
    menu: $("#menu").value.trim(),
    water: $("#water").value.trim(),
    fruit: $("#fruit").value.trim(),
    items
  };
}
function validate(log) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(log.date)) return "Selecciona una fecha válida.";
  if (!log.center) return "Escribe el nombre del centro.";
  if (log.breakfasts !== "" && (!Number.isFinite(log.breakfasts) || log.breakfasts < 0)) return "Revisa la cantidad de desayunos.";
  if (log.mealsServed !== "" && (!Number.isFinite(log.mealsServed) || log.mealsServed < 0)) return "Revisa la cantidad de comidas.";
  for (const item of log.items) {
    if (!item.description) return "Completa la descripción de cada insumo que tenga cantidad o unidad.";
    if (item.quantity !== "" && (!Number.isFinite(item.quantity) || item.quantity < 0)) return "Las cantidades deben ser números iguales o mayores que cero.";
    if (!item.unit) return `Indica la unidad del insumo: ${item.description}.`;
  }
  return "";
}
function editLog(id) {
  const log = logs.find(item => item.id === id);
  if (!log) return;
  editingId = id;
  $("#date").value = log.date;
  $("#center").value = log.center || "";
  $("#cook").value = log.cook || "";
  $("#breakfasts").value = log.breakfasts ?? "";
  $("#mealsServed").value = log.mealsServed ?? "";
  $("#menu").value = log.menu || "";
  $("#water").value = log.water || "";
  $("#fruit").value = log.fruit || "";
  $("#itemGroups").innerHTML = CATEGORIES.map(category => categoryMarkup(category, log.items.filter(item => item.category === category.id))).join("");
  $("#formHeading").textContent = `Editar registro · ${dateLabel(log.date)}`;
  $("#saveLog").textContent = "Guardar cambios";
  $("#date").scrollIntoView({ behavior:"smooth", block:"center" });
}
function render() {
  const sorted = [...logs].sort((a,b) => b.date.localeCompare(a.date));
  $("#statDays").textContent = logs.length;
  $("#statItems").textContent = logs.reduce((sum, log) => sum + log.items.length, 0);
  $("#statCenters").textContent = new Set(logs.map(log => log.center).filter(Boolean)).size;
  $("#recordsCount").textContent = `${logs.length} registro${logs.length === 1 ? "" : "s"}`;
  const query = ($("#search").value || "").trim().toLocaleLowerCase("es-MX");
  const month = $("#monthFilter").value;
  const filtered = sorted.filter(log => (!month || log.date.startsWith(month)) &&
    (!query || [log.date, log.center, log.cook, log.menu, ...log.items.map(i => i.description)].join(" ").toLocaleLowerCase("es-MX").includes(query)));
  $("#recordsList").innerHTML = filtered.length ? filtered.map(log => `
    <article class="record-card">
      <div class="record-date"><span>${escapeHTML(dateLabel(log.date))}</span><strong>${escapeHTML(log.center || "Centro sin nombre")}</strong><small>${log.items.length} insumos · ${escapeHTML(log.cook || "Sin encargado")}</small></div>
      <div class="record-menu"><span class="eyebrow">MENÚ</span><p>${escapeHTML(log.menu || "Sin menú registrado")}</p><small>Desayunos: ${log.breakfasts === "" ? "—" : escapeHTML(log.breakfasts)} · Comidas: ${log.mealsServed === "" ? "—" : escapeHTML(log.mealsServed)}</small></div>
      <div class="record-actions"><button class="button secondary edit-log" data-id="${escapeHTML(log.id)}">Editar</button><button class="button danger delete-log" data-id="${escapeHTML(log.id)}">Eliminar</button></div>
    </article>`).join("") : '<div class="empty"><h3>No hay registros que mostrar</h3><p>Agrega un registro o cambia los filtros.</p></div>';
}
$("#itemGroups").innerHTML = CATEGORIES.map(category => categoryMarkup(category)).join("");
$("#date").value = todayISO();
$("#monthFilter").value = todayISO().slice(0, 7);
$("#addNew").addEventListener("click", () => {
  clearForm();
  $("#formHeading").textContent = "Nuevo registro de alimentos";
  $("#logForm").scrollIntoView({ behavior:"smooth", block:"start" });
});
$("#logForm").addEventListener("submit", event => {
  event.preventDefault();
  const log = getFormData();
  const issue = validate(log);
  if (issue) return notify(issue, true);
  const duplicate = logs.find(item => item.date === log.date && item.id !== editingId);
  if (duplicate && !confirm("Ya existe un registro para esa fecha. ¿Quieres reemplazarlo con estos datos?")) return;
  if (duplicate) logs = logs.filter(item => item.id !== duplicate.id);
  if (editingId) logs = logs.map(item => item.id === editingId ? log : item);
  else logs.push(log);
  if (save()) {
    clearForm();
    notify("Registro guardado correctamente.");
    $("#records").scrollIntoView({ behavior:"smooth", block:"start" });
  }
});
$("#itemGroups").addEventListener("click", event => {
  const add = event.target.closest(".add-line");
  if (add) {
    $(".line-list", add.closest(".item-group")).insertAdjacentHTML("beforeend", lineMarkup());
    $(".line-description", $(".line-list", add.closest(".item-group")).lastElementChild).focus();
  }
  const remove = event.target.closest(".remove-line");
  if (remove) {
    const list = remove.closest(".line-list");
    if (list.children.length === 1) {
      $$(".line-row input", list).forEach(input => input.value = "");
    } else remove.closest(".line-row").remove();
  }
});
$("#recordsList").addEventListener("click", event => {
  const edit = event.target.closest(".edit-log");
  if (edit) return editLog(edit.dataset.id);
  const del = event.target.closest(".delete-log");
  if (del) {
    const log = logs.find(item => item.id === del.dataset.id);
    if (log && confirm(`¿Eliminar el registro del ${dateLabel(log.date)}? Esta acción no se puede deshacer.`)) {
      logs = logs.filter(item => item.id !== log.id);
      save();
      notify("Registro eliminado.");
    }
  }
});
$("#search").addEventListener("input", render);
$("#monthFilter").addEventListener("change", render);

function xmlEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function cell(value, numeric = false) {
  if (value === "" || value === null || value === undefined) return "<Cell><Data ss:Type=\"String\"></Data></Cell>";
  const type = numeric && Number.isFinite(Number(value)) ? "Number" : "String";
  return `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
}
function row(values) { return `<Row>${values.map(value => Array.isArray(value) ? cell(value[0], value[1]) : cell(value)).join("")}</Row>`; }
function worksheet(name, rows) {
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${rows.join("")}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Landscape"/></PageSetup><FitToPage/><Print><ValidPrinterInfo/><PaperSizeIndex>9</PaperSizeIndex><Scale>75</Scale></Print></WorksheetOptions></Worksheet>`;
}
function buildExcel() {
  const sorted = [...logs].sort((a,b) => a.date.localeCompare(b.date));
  const dailyRows = [row(["Fecha","Centro","Encargado de cocina","Desayunos otorgados","Comidas otorgadas","Menú","Agua","Fruta","Categoría","Descripción","Cantidad","Unidad"])];
  sorted.forEach(log => {
    if (!log.items.length) {
      dailyRows.push(row([log.date,log.center,log.cook,[log.breakfasts,true],[log.mealsServed,true],log.menu,log.water,log.fruit,"","","",""]));
    } else {
      log.items.forEach(item => dailyRows.push(row([log.date,log.center,log.cook,[log.breakfasts,true],[log.mealsServed,true],log.menu,log.water,log.fruit,CATEGORIES.find(c => c.id === item.category)?.label || item.category,item.description,[item.quantity,true],item.unit])));
    }
  });
  const month = $("#monthFilter").value || todayISO().slice(0,7);
  const monthLogs = sorted.filter(log => log.date.startsWith(month));
  const dates = [...new Set(monthLogs.map(log => log.date))].sort();
  const summaryRows = [row(["Categoría","Descripción","Unidad",...dates,"TOTAL"])];
  const itemsByKey = new Map();
  monthLogs.forEach(log => log.items.forEach(item => {
    const key = [item.category,item.description,item.unit].join("\u0000");
    if (!itemsByKey.has(key)) itemsByKey.set(key,{ category:item.category, description:item.description, unit:item.unit, amounts:{} });
    const target = itemsByKey.get(key);
    const current = Number(target.amounts[log.date] || 0);
    target.amounts[log.date] = current + (Number(item.quantity) || 0);
  }));
  [...itemsByKey.values()].sort((a,b) => a.category.localeCompare(b.category) || a.description.localeCompare(b.description,"es-MX")).forEach(item => {
    const total = dates.reduce((sum,date) => sum + Number(item.amounts[date] || 0),0);
    summaryRows.push(row([CATEGORIES.find(c => c.id === item.category)?.label || item.category,item.description,item.unit,...dates.map(date => [item.amounts[date] ?? "", true]),[total,true]]));
  });
  const book = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">${worksheet("Registros diarios",dailyRows)}${worksheet("Concentrado",summaryRows)}</Workbook>`;
  return book;
}
$("#exportExcel").addEventListener("click", () => {
  if (!logs.length) return notify("Todavía no hay registros para exportar.", true);
  try {
    const blob = new Blob(["\uFEFF",buildExcel()], { type:"application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `YEXCEL-registro-alimentos-${$("#monthFilter").value || todayISO().slice(0,7)}.xls`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify("Archivo de Excel generado con las hojas Registro diario y Concentrado.");
  } catch { notify("No se pudo generar el archivo de Excel.", true); }
});
$("#exportBackup").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({format:"yexcel-food-logs",version:1,exportedAt:new Date().toISOString(),logs},null,2)],{type:"application/json;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="yexcel-respaldo-alimentos.json"; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("Respaldo JSON descargado.");
});
$("#importBackup").addEventListener("change", async event => {
  const file = event.target.files?.[0]; event.target.value = "";
  if (!file) return;
  if (file.size > 5_000_000) return notify("El archivo supera el límite de 5 MB.", true);
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed?.format !== "yexcel-food-logs" || parsed.version !== 1 || !Array.isArray(parsed.logs) ||
        parsed.logs.some(log => !log || typeof log.id !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(log.date) || !Array.isArray(log.items))) {
      return notify("El archivo no es un respaldo YEXCEL válido.", true);
    }
    if (!confirm(`Se reemplazarán ${logs.length} registros actuales por ${parsed.logs.length} registros del respaldo. ¿Continuar?`)) return;
    const previous = logs;
    logs = parsed.logs;
    if (!save()) logs = previous;
    else notify("Respaldo restaurado.");
  } catch { notify("No se pudo leer el respaldo JSON.", true); }
});
$("#clearForm").addEventListener("click", clearForm);
render();

const viewCopy = {
  registro: { title: "Capturar registro", subtitle: "Llena la hoja del día sin volver a escribir los nombres de los insumos." },
  records: { title: "Historial de registros", subtitle: "Busca, revisa y corrige registros guardados en este dispositivo." },
  export: { title: "Exportar a Excel", subtitle: "Genera el archivo organizado para continuar el trabajo en Excel." }
};
function showView(view) {
  if (!viewCopy[view]) return;
  ["registro", "records", "export"].forEach(id => {
    const section = document.getElementById(id);
    if (section) section.hidden = id !== view;
  });
  $(".nav-link[data-view]").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  $("#pageTitle").textContent = viewCopy[view].title;
  $(".topbar .subtitle").textContent = viewCopy[view].subtitle;
  $(".stats").hidden = view !== "registro";
  $("#addNew").hidden = view !== "registro";
  history.replaceState(null, "", "#" + view);
}
$(".nav-link[data-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
$("#addNew").addEventListener("click", () => {
  clearForm();
  showView("registro");
  $("#formHeading").textContent = "Nuevo registro de alimentos";
  $("#date").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
});
const initialView = location.hash.slice(1);
showView(viewCopy[initialView] ? initialView : "registro");

