import { buildFoodLogXlsx } from "./xlsx-export.js";
import { parseFoodLogPdf } from "./pdf-import.js?v=ocr-fix-2";
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
const CATALOG = [
  {id:"desayuno",label:"Desayuno",items:[["Yogurth","LITROS"],["Papaya","PIEZAS"],["Granola","KG"]]},
  {id:"fruta",label:"Fruta y verdura",items:[
    ["Pimiento morrón","KG"],["Cebolla","KG"],["Tomate","KG"],["Apio","KG"],["Limón","KG"],["Cilantro","MN"],
    ["Nopal","KG"],["Queso panela","KG"],["Chile poblano","KG"]
  ]},
  {id:"abarrotes",label:"Abarrotes y desechables",items:[
    ["Aceite","LITRO"],["Arroz","KG"],["Tenedor","PQTE"],["Cuchara","PQTE"],["Servilletas","PIEZAS"],
    ["Achiote","KG"],["Jugo de naranja","LITRO"],["Elote","LATAS"],["Tortillas","KG"],
    ["Consomé","SOBRE"],["Papel aluminio","ROLLO"],["Clight","SOBRES"]
  ]},
  {id:"carnes",label:"Carnes y carnes frías",items:[
    ["Filete de pescado","PIEZAS"],["Pierna y muslo","KG"],["Pechuga de pollo","KG"],
    ["Carne molida","KG"],["Mantequilla","KG"],["Margarina","PIEZAS"]
  ]},
  {id:"condimentos",label:"Condimentos y granos",items:[
    ["Garbanzo","KG"],["Frijol","KG"],["Lentejas","KG"],["Pimienta","KG"],
    ["Comino","KG"],["Ajo","KG"],["Sal","KG"],["Jamaica","KG"]
  ]}
];
CATEGORIES.splice(0,CATEGORIES.length,...CATALOG.map(({id,label})=>({id,label})));
function categoryMarkup(category, items = []) {
  const defaults = CATALOG.find(c => c.id === category.id)?.items || [];
  const saved = new Map(items.map(item => [String(item.description || "").toLocaleLowerCase("es-MX"), item]));
  const rows = defaults.map(([description,unit]) => ({
    category:category.id, description, unit,
    quantity:saved.get(description.toLocaleLowerCase("es-MX"))?.quantity ?? ""
  }));
  // Conserva insumos antiguos si ya había registros con productos fuera del catálogo fijo.
  items.filter(item => !defaults.some(([name]) => name.toLocaleLowerCase("es-MX") === String(item.description || "").toLocaleLowerCase("es-MX")))
    .forEach(item => rows.push(item));
  return `<section class="item-group paper-table" data-category="${category.id}">
    <div class="group-heading"><h3>${escapeHTML(category.label)}</h3></div>
    <div class="paper-columns"><span>INSUMO</span><span>CANTIDAD</span><span>UNIDAD</span></div>
    <div class="line-list">${rows.map(lineMarkup).join("")}</div>
  </section>`;
}
function lineMarkup(item = {}) {
  const description = item.description || "";
  const unit = item.unit || "";
  return `<div class="line-row paper-row">
    <div class="line-description" title="${escapeHTML(description)}">${escapeHTML(description)}</div>
    <label class="quantity-cell"><span class="mobile-only">Cantidad</span><input class="line-quantity" type="number" min="0" max="100000000" step="any" value="${item.quantity ?? ""}" placeholder="—" aria-label="Cantidad de ${escapeHTML(description || "insumo")}"></label>
    <div class="line-unit" aria-label="Unidad de medida">${escapeHTML(unit || "—")}</div>
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
      const description = $(".line-description", row).textContent.trim();
      const quantityRaw = $(".line-quantity", row).value;
      const unitText = $(".line-unit", row).textContent.trim();
      const unit = unitText === "—" ? "" : unitText;
      if (quantityRaw === "") return;
      if (!description && !unit) return;
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
function renderInventoryTotals() {
  const totals = new Map();
  logs.forEach(log => {
    (Array.isArray(log.items) ? log.items : []).forEach(item => {
      const description = String(item.description || '').trim();
      const unit = String(item.unit || '').trim();
      const quantity = item.quantity === '' || item.quantity == null ? NaN : Number(item.quantity);
      if (!description || !Number.isFinite(quantity)) return;
      const normalized = description.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('es-MX');
      const key = normalized + '|' + unit.toLocaleLowerCase('es-MX');
      const current = totals.get(key) || { description, unit, quantity: 0 };
      current.quantity += quantity;
      totals.set(key, current);
    });
  });
  const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 6 });
  const rows = [...totals.values()].sort((a, b) => a.description.localeCompare(b.description, 'es-MX', { sensitivity: 'base' }) || a.unit.localeCompare(b.unit, 'es-MX', { sensitivity: 'base' }));
  $('#inventoryCount').textContent = rows.length + ' insumo' + (rows.length === 1 ? '' : 's');
  $('#inventoryTotalsBody').innerHTML = rows.length ? rows.map(item => '<tr><td>' + escapeHTML(item.description) + '</td><td>' + escapeHTML(item.unit || '—') + '</td><td class="inventory-quantity">' + numberFormat.format(item.quantity) + '</td></tr>').join('') : '<tr><td colspan="3">Todavía no hay cantidades registradas.</td></tr>';
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
  renderInventoryTotals();
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
// El botón Nuevo registro se conecta al sistema de vistas al final del archivo.
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

$("#exportExcel").addEventListener("click", () => {
  if (!logs.length) return notify("Todavía no hay registros para exportar.", true);
  try {
    const month = $("#monthFilter").value || todayISO().slice(0, 7);
    const workbookBytes = buildFoodLogXlsx(logs, month, CATALOG);
    const blob = new Blob([workbookBytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "YEXCEL-registro-alimentos-" + month + ".xlsx";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify("Archivo .xlsx generado: concentrado mensual y registros diarios.");
  } catch (error) {
    console.error("YEXCEL export error:", error);
    notify(error?.message || "No se pudo generar el archivo de Excel.", true);
  }
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

const pdfInput = $("#pdfFile");
const pdfDropzone = $("#pdfDropzone");
let pdfBusy = false;

async function importSelectedPdf(file) {
  if (!file) return;
  if (!file.name?.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    $("#pdfImportStatus").textContent = "Ese archivo no es un PDF. Selecciona un archivo .pdf.";
    $("#pdfImportStatus").classList.add("error");
    notify("Selecciona un archivo PDF válido.", true);
    return;
  }
  if (pdfBusy) return;
  pdfBusy = true;
  pdfInput.value = ""; // Permite volver a elegir el mismo archivo si el usuario reintenta.
  $("#pdfFileName").textContent = file.name;
  $("#pdfImportStatus").textContent = "Preparando el PDF para extraer sus datos…";
  $("#pdfImportStatus").classList.remove("error");
  pdfDropzone?.classList.add("is-processing");
  try {
    const result = await parseFoodLogPdf(file, CATALOG, message => {
      $("#pdfImportStatus").textContent = message;
    });
    const fields = result.fields;
    if (fields.date) $("#date").value = fields.date;
    if (fields.center) $("#center").value = fields.center;
    if (fields.cook) $("#cook").value = fields.cook;
    if (fields.breakfasts !== "" && Number.isFinite(fields.breakfasts)) $("#breakfasts").value = fields.breakfasts;
    if (fields.mealsServed !== "" && Number.isFinite(fields.mealsServed)) $("#mealsServed").value = fields.mealsServed;
    if (fields.menu) $("#menu").value = fields.menu;
    if (fields.water) $("#water").value = fields.water;
    if (fields.fruit) $("#fruit").value = fields.fruit;
    if (result.items.length) {
      const imported = new Map(result.items.map(item => [item.description.toLocaleLowerCase("es-MX"), item]));
      $(".line-row").forEach(row => {
        const description = $(".line-description", row).textContent.trim().toLocaleLowerCase("es-MX");
        const item = imported.get(description);
        if (item) $(".line-quantity", row).value = item.quantity;
      });
    }
    const filled = Object.values(fields).filter(value => value !== "" && value != null).length + result.items.length;
    if (!filled) {
      $("#pdfImportStatus").textContent = "El PDF se abrió, pero no se detectaron datos reconocibles. Revisa que sea el formato correcto.";
      $("#pdfImportStatus").classList.add("error");
      notify("No se detectaron datos reconocibles en el PDF.", true);
      return;
    }
    $("#pdfImportStatus").textContent = `Extracción terminada${result.usedOCR ? " mediante OCR" : ""}: ${result.pageCount} página(s), ${filled} dato(s) detectado(s). Revisa los campos antes de guardar.`;
    notify("PDF leído. Revisa los datos y guarda el registro.");
  } catch (error) {
    console.error("YEXCEL PDF import error:", error);
    $("#pdfImportStatus").textContent = error?.message || "No se pudo procesar el PDF.";
    $("#pdfImportStatus").classList.add("error");
    notify(error?.message || "No se pudo procesar el PDF.", true);
  } finally {
    pdfBusy = false;
    pdfDropzone?.classList.remove("is-processing");
  }
}

pdfInput.addEventListener("change", event => {
  const file = event.currentTarget.files?.[0] || event.target.files?.[0];
  if (!file) {
    $("#pdfImportStatus").textContent = "No se recibió ningún archivo. Pulsa el selector y elige el PDF.";
    $("#pdfImportStatus").classList.add("error");
    return;
  }
  $("#pdfFileName").textContent = file.name;
  $("#pdfImportStatus").textContent = "Archivo detectado. La extracción comenzará automáticamente…";
  $("#pdfImportStatus").classList.remove("error");
  importSelectedPdf(file);
});
pdfDropzone?.addEventListener("click", event => {
  if (event.target !== pdfInput) pdfInput.click();
});
pdfDropzone?.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    pdfInput.click();
  }
});
["dragenter", "dragover"].forEach(type => pdfDropzone?.addEventListener(type, event => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  pdfDropzone.classList.add("is-dragover");
}));
["dragleave", "dragend"].forEach(type => pdfDropzone?.addEventListener(type, event => {
  event.preventDefault();
  pdfDropzone.classList.remove("is-dragover");
}));
pdfDropzone?.addEventListener("drop", event => {
  event.preventDefault();
  pdfDropzone.classList.remove("is-dragover");
  const file = [...(event.dataTransfer?.files || [])].find(item => item.type === "application/pdf" || item.name.toLowerCase().endsWith(".pdf"));
  if (!file) {
    $("#pdfImportStatus").textContent = "No se encontró un PDF. Suelta un archivo con extensión .pdf.";
    $("#pdfImportStatus").classList.add("error");
    notify("Arrastra un archivo PDF.", true);
    return;
  }
  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    pdfInput.files = transfer.files;
  } catch { /* El archivo se procesa aunque el navegador no permita asignarlo al input. */ }
  importSelectedPdf(file);
});
$("#clearForm").addEventListener("click", clearForm);
render();

const viewCopy = {
  registro: { title: "Capturar registro", subtitle: "Llena la hoja del día sin volver a escribir los nombres de los insumos." },
  records: { title: "Historial de registros", subtitle: "Busca, revisa y corrige registros guardados en este dispositivo." },
  export: { title: "Exportar a Excel", subtitle: "Genera el archivo organizado para continuar el trabajo en Excel." }
};
function showView(view, { updateAddress = true, scrollTop = true } = {}) {
  if (!viewCopy[view]) view = "registro";

  // Cada opción del menú muestra una sola pantalla funcional.
  const screenIds = ["registro", "records", "export"];
  screenIds.forEach(id => {
    const section = document.getElementById(id);
    if (section) {
      section.hidden = id !== view;
      section.setAttribute("aria-hidden", id === view ? "false" : "true");
    }
  });

  document.querySelectorAll(".nav-link[data-view]").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  $("#pageTitle").textContent = viewCopy[view].title;
  $(".topbar .subtitle").textContent = viewCopy[view].subtitle;
  $(".stats").hidden = view !== "registro";
  $("#addNew").hidden = view !== "registro";

  // La navegación cambia la vista y la dirección; no desplaza a una sección larga.
  if (updateAddress && location.hash !== "#" + view) {
    history.pushState({ view }, "", "#" + view);
  }
  if (scrollTop) window.scrollTo({ top: 0, behavior: "auto" });
}

document.querySelectorAll(".nav-link[data-view]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    showView(button.dataset.view);
  });
});
window.addEventListener("popstate", () => showView(location.hash.slice(1), { updateAddress: false }));
window.addEventListener("hashchange", () => showView(location.hash.slice(1), { updateAddress: false }));
$("#addNew").addEventListener("click", () => {
  clearForm();
  showView("registro");
  $("#formHeading").textContent = "Nuevo registro de alimentos";
  $("#date").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
});
const initialView = location.hash.slice(1);
showView(viewCopy[initialView] ? initialView : "registro", { updateAddress: false, scrollTop: false });

