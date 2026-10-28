import { buildFoodLogXlsx } from "./xlsx-export.js";

const STORAGE_KEY = "yexcelFoodLogsV1";
const CENTER_DEFAULT = "Casa club: Caminando Juntos";
const CATALOG = [
  { id: "desayuno", label: "Desayuno", items: [["Yogurth", "LITROS"], ["Papaya", "PIEZAS"], ["Granola", "KG"]] },
  { id: "fruta", label: "Fruta y verdura", items: [["Pimiento morrón", "KG"], ["Cebolla", "KG"], ["Tomate", "KG"], ["Apio", "KG"], ["Limón", "KG"], ["Cilantro", "MN"], ["Nopal", "KG"], ["Queso panela", "KG"], ["Chile poblano", "KG"]] },
  { id: "abarrotes", label: "Abarrotes y desechables", items: [["Aceite", "LITRO"], ["Arroz", "KG"], ["Tenedor", "PQTE"], ["Cuchara", "PQTE"], ["Servilletas", "PIEZAS"], ["Achiote", "KG"], ["Jugo de naranja", "LITRO"], ["Elote", "LATAS"], ["Tortillas", "KG"], ["Consomé", "SOBRE"], ["Papel aluminio", "ROLLO"], ["Clight", "SOBRES"]] },
  { id: "carnes", label: "Carnes y carnes frías", items: [["Filete de pescado", "PIEZAS"], ["Pierna y muslo", "KG"], ["Pechuga de pollo", "KG"], ["Carne molida", "KG"], ["Mantequilla", "KG"], ["Margarina", "PIEZAS"]] },
  { id: "condimentos", label: "Condimentos y granos", items: [["Garbanzo", "KG"], ["Frijol", "KG"], ["Lentejas", "KG"], ["Pimienta", "KG"], ["Comino", "KG"], ["Ajo", "KG"], ["Sal", "KG"], ["Jamaica", "KG"]] }
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const todayISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
const uid = () => globalThis.crypto?.randomUUID?.() || "log-" + Date.now() + "-" + Math.random().toString(36).slice(2);
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const num = value => value === "" || value == null ? "" : Number(value);
const prettyDate = value => { if(!value) return "Sin fecha"; const p=value.split("-").map(Number); return new Date(p[0],p[1]-1,p[2],12).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"}); };
const monthLabel = value => { if(!value) return "este mes"; const p=value.split("-").map(Number); return new Date(p[0],p[1]-1,1,12).toLocaleDateString("es-MX",{month:"long",year:"numeric"}); };
let logs = loadLogs();
let editingId = null;
let toastTimer = null;
let dialogResolver = null;

function loadLogs() {
  try { const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); return Array.isArray(data)?data.filter(x=>x&&typeof x.id==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Array.isArray(x.items)):[]; }
  catch { return []; }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(logs)); $("#storageState").textContent="Guardado en este dispositivo"; renderAll(); return true; }
  catch { notify("No se pudieron guardar los datos. Descarga un respaldo y libera espacio del navegador.",true); return false; }
}
function notify(message,error=false) {
  const node=$("#toast"); node.textContent=message; node.classList.toggle("error",error); node.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>node.classList.remove("show"),3500);
}
function askConfirm(title,message,confirmLabel="Confirmar") {
  $("#dialogTitle").textContent=title; $("#dialogMessage").textContent=message; $("#dialogConfirm").textContent=confirmLabel; $("#confirmDialog").hidden=false;
  return new Promise(resolve=>{dialogResolver=resolve;});
}
function closeDialog(value) { $("#confirmDialog").hidden=true; if(dialogResolver){const resolve=dialogResolver;dialogResolver=null;resolve(value);} }

function lineMarkup(categoryId, description, unit, quantity="") {
  const filled=quantity!==""&&quantity!=null;
  return '<div class="line-row" data-category="'+esc(categoryId)+'" data-description="'+esc(description)+'" data-unit="'+esc(unit)+'">'+
    '<div class="line-description">'+esc(description)+'</div>'+
    '<label class="quantity-cell"><input class="line-quantity'+(filled?" has-value":"")+'" type="number" min="0" max="100000000" step="any" value="'+(filled?esc(quantity):"")+'" placeholder="—" aria-label="Cantidad de '+esc(description)+'"></label>'+
    '<div class="line-unit">'+esc(unit)+'</div></div>';
}
function renderCatalog(existingItems=[]) {
  const saved=new Map(existingItems.map(item=>[String(item.description||"").toLocaleLowerCase("es-MX"),item]));
  $("#itemGroups").innerHTML=CATALOG.map(category=>{
    const rows=category.items.map(([description,unit])=>{
      const old=saved.get(description.toLocaleLowerCase("es-MX"));
      return lineMarkup(category.id,description,unit,old?.quantity??"");
    }).join("");
    return '<section class="item-group" data-category="'+category.id+'"><div class="group-heading"><h3>'+esc(category.label)+'</h3><span class="group-count">'+category.items.length+' insumos</span></div>'+
      '<div class="supply-head"><span>INSUMO</span><span>CANTIDAD</span><span>UNIDAD</span></div>'+rows+'</section>';
  }).join("");
  filterCatalog();
}
function filterCatalog() {
  const query=$("#catalogSearch").value.trim().toLocaleLowerCase("es-MX"); let visible=0;
  $$(".item-group").forEach(group=>{
    let count=0;
    $$(".line-row",group).forEach(row=>{const show=!query||row.dataset.description.toLocaleLowerCase("es-MX").includes(query);row.hidden=!show;if(show)count++;});
    group.hidden=count===0;if(count)visible+=count;
    const badge=$(".group-count",group);if(badge)badge.textContent=count+" insumos";
  });
  $("#noCatalogResults").hidden=visible>0;
}
function clearForm() {
  editingId=null; $("#logForm").reset(); $("#date").value=todayISO(); $("#center").value=CENTER_DEFAULT;
  $("#formHeading").textContent="Registro de alimentos"; $("#saveLog").innerHTML='Guardar registro <span>→</span>';
  renderCatalog(); $("#catalogSearch").value="";
}
function collectForm() {
  const items=[];
  $$(".line-row").forEach(row=>{
    const raw=$(".line-quantity",row).value;
    if(raw!=="") items.push({category:row.dataset.category,description:row.dataset.description,unit:row.dataset.unit,quantity:num(raw)});
  });
  return {id:editingId||uid(),date:$("#date").value,center:$("#center").value.trim(),cook:$("#cook").value.trim(),breakfasts:num($("#breakfasts").value),mealsServed:num($("#mealsServed").value),menu:$("#menu").value.trim(),water:$("#water").value.trim(),fruit:$("#fruit").value.trim(),items};
}
function validateLog(log) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(log.date)) return "Selecciona una fecha válida.";
  if(!log.center) return "Escribe el nombre del centro.";
  for(const key of ["breakfasts","mealsServed"]) if(log[key]!==""&&(!Number.isFinite(log[key])||log[key]<0)) return "Las cantidades de desayunos y comidas deben ser números iguales o mayores que cero.";
  for(const item of log.items) if(!Number.isFinite(item.quantity)||item.quantity<0) return "Las cantidades de los insumos deben ser números iguales o mayores que cero.";
  return "";
}
async function submitLog(event) {
  event.preventDefault(); const log=collectForm(); const error=validateLog(log); if(error)return notify(error,true);
  const duplicate=logs.find(item=>item.date===log.date&&item.id!==editingId);
  if(duplicate) { const ok=await askConfirm("Ya existe un registro para esa fecha","¿Deseas reemplazar el registro del "+prettyDate(log.date)+" con los datos actuales?","Reemplazar"); if(!ok)return; logs=logs.filter(item=>item.id!==duplicate.id); }
  if(editingId) logs=logs.map(item=>item.id===editingId?log:item); else logs.push(log);
  if(persist()){clearForm();showView("historial");notify("Registro guardado correctamente.");}
}
function editLog(id) {
  const log=logs.find(item=>item.id===id);if(!log)return;
  editingId=id;$("#date").value=log.date;$("#center").value=log.center||CENTER_DEFAULT;$("#cook").value=log.cook||"";
  $("#breakfasts").value=log.breakfasts??"";$("#mealsServed").value=log.mealsServed??"";$("#menu").value=log.menu||"";$("#water").value=log.water||"";$("#fruit").value=log.fruit||"";
  $("#formHeading").textContent="Editar registro · "+prettyDate(log.date);$("#saveLog").innerHTML='Guardar cambios <span>→</span>';
  renderCatalog(log.items);showView("registro");window.scrollTo({top:0,behavior:"smooth"});
}
async function deleteLog(id) {
  const log=logs.find(item=>item.id===id);if(!log)return;
  if(!await askConfirm("Eliminar registro","Se eliminará el registro del "+prettyDate(log.date)+". Esta acción no se puede deshacer.","Eliminar"))return;
  logs=logs.filter(item=>item.id!==id);persist();notify("Registro eliminado.");
}
function renderHistory() {
  const query=$("#search").value.trim().toLocaleLowerCase("es-MX"),month=$("#monthFilter").value;
  const sorted=[...logs].sort((a,b)=>b.date.localeCompare(a.date));
  const filtered=sorted.filter(log=>(!month||log.date.startsWith(month))&&(!query||[log.date,log.center,log.cook,log.menu,log.water,log.fruit,...log.items.map(i=>i.description)].join(" ").toLocaleLowerCase("es-MX").includes(query)));
  $("#recordsCount").textContent=filtered.length+" registro"+(filtered.length===1?"":"s");
  $("#recordsSubtitle").textContent=month?"Mostrando "+monthLabel(month):"Registros organizados por fecha";
  $("#recordsList").innerHTML=filtered.length?filtered.map(log=>'<article class="record-card"><div class="record-date"><span>'+esc(prettyDate(log.date))+'</span><strong>'+esc(log.center||"Centro sin nombre")+'</strong><small>'+log.items.length+' insumos · '+esc(log.cook||"Sin encargado")+'</small></div><div class="record-menu"><div class="eyebrow">MENÚ</div><p>'+esc(log.menu||"Sin menú registrado")+'</p><small>Desayunos: '+(log.breakfasts===""?"—":esc(log.breakfasts))+' · Comidas: '+(log.mealsServed===""?"—":esc(log.mealsServed))+'</small></div><div class="record-actions"><button class="button button-quiet edit-log" data-id="'+esc(log.id)+'" type="button">Editar</button><button class="button delete-log" data-id="'+esc(log.id)+'" type="button">Eliminar</button></div></article>').join(""):'<div class="empty"><h3>No hay registros que mostrar</h3><p>Agrega un registro o modifica los filtros de búsqueda.</p></div>';
}
function renderStats() {
  $("#statDays").textContent=logs.length;
  $("#statItems").textContent=logs.reduce((sum,log)=>sum+log.items.length,0);
  const latest=[...logs].sort((a,b)=>b.date.localeCompare(a.date))[0];
  $("#statLastDate").textContent=latest?prettyDate(latest.date):"—";
}
function renderExport() {
  const month=$("#exportMonth").value||todayISO().slice(0,7);
  const monthLogs=logs.filter(log=>log.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
  $("#exportCount").textContent=monthLogs.length;
  $("#monthPreview").innerHTML=monthLogs.length?monthLogs.map(log=>'<div class="preview-day"><span>'+esc(prettyDate(log.date))+'</span><strong>'+log.items.length+' insumos</strong><em>Registrado</em></div>').join(""):'<div class="empty"><h3>Sin registros para este mes</h3><p>Cuando guardes registros, aparecerán aquí.</p></div>';
  $("#exportExcel").disabled=monthLogs.length===0;
}
function renderAll(){renderStats();renderHistory();renderExport();}
function showView(view) {
  const titles={registro:"Nuevo registro",historial:"Historial",concentrado:"Concentrado mensual"};
  if(!titles[view])view="registro";
  $$(".view").forEach(node=>{const active=node.id==="view-"+view;node.hidden=!active;node.classList.toggle("active",active);});
  $$(".nav-link").forEach(node=>{const active=node.dataset.view===view;node.classList.toggle("active",active);if(active)node.setAttribute("aria-current","page");else node.removeAttribute("aria-current");});
  $("#breadcrumbCurrent").textContent=titles[view];$("#addNew").hidden=view==="registro";
  $("#sidebar").classList.remove("open");
  if(location.hash!=="#"+view)history.replaceState({view},"","#"+view);
  window.scrollTo({top:0,behavior:"auto"});
}
function downloadBlob(blob,filename) {
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function exportExcel() {
  const month=$("#exportMonth").value||todayISO().slice(0,7);const monthLogs=logs.filter(log=>log.date.startsWith(month));
  if(!monthLogs.length)return notify("No hay registros para "+monthLabel(month)+".",true);
  try {
    const bytes=buildFoodLogXlsx(logs,month,CATALOG);
    downloadBlob(new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"YEXCEL-registro-alimentos-"+month+".xlsx");
    notify("Archivo Excel generado. Revisa las sumas y el formato antes de imprimir.");
  } catch(error){console.error(error);notify(error?.message||"No se pudo generar el archivo Excel.",true);}
}
function exportBackup() {
  const data={format:"yexcel-food-logs",version:1,exportedAt:new Date().toISOString(),logs};
  downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),"yexcel-respaldo-alimentos.json");
  notify("Respaldo descargado.");
}
async function importBackup(event) {
  const file=event.target.files?.[0];event.target.value="";if(!file)return;
  if(file.size>5000000)return notify("El archivo supera el límite de 5 MB.",true);
  try {
    const parsed=JSON.parse(await file.text());
    if(parsed?.format!=="yexcel-food-logs"||parsed.version!==1||!Array.isArray(parsed.logs)||parsed.logs.some(log=>!log||typeof log.id!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(log.date)||!Array.isArray(log.items)))return notify("El archivo no es un respaldo YEXCEL válido.",true);
    if(!await askConfirm("Restaurar respaldo","Se reemplazarán "+logs.length+" registros actuales por "+parsed.logs.length+" registros del respaldo.","Restaurar"))return;
    const old=logs;logs=parsed.logs;if(!persist())logs=old;else notify("Respaldo restaurado correctamente.");
  } catch {notify("No se pudo leer el archivo de respaldo.",true);}
}

$("#logForm").addEventListener("submit",submitLog);
$("#itemGroups").addEventListener("input",event=>{if(event.target.matches(".line-quantity"))event.target.classList.toggle("has-value",event.target.value!=="");});
$("#catalogSearch").addEventListener("input",filterCatalog);
$("#clearForm").addEventListener("click",clearForm);
$("#search").addEventListener("input",renderHistory);
$("#monthFilter").addEventListener("change",renderHistory);
$("#clearFilters").addEventListener("click",()=>{$("#search").value="";$("#monthFilter").value="";renderHistory();});
$("#exportMonth").addEventListener("change",renderExport);
$("#exportExcel").addEventListener("click",exportExcel);
$("#exportBackup").addEventListener("click",exportBackup);
$("#importBackup").addEventListener("change",importBackup);
$("#addNew").addEventListener("click",()=>{clearForm();showView("registro");$("#date").focus({preventScroll:true});});
$$(".nav-link").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.view)));
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#dialogCancel").addEventListener("click",()=>closeDialog(false));
$("#dialogConfirm").addEventListener("click",()=>closeDialog(true));
$("#confirmDialog").addEventListener("click",event=>{if(event.target.id==="confirmDialog")closeDialog(false);});
window.addEventListener("keydown",event=>{if(event.key==="Escape"&&!$("#confirmDialog").hidden)closeDialog(false);if(event.key==="Escape")$("#sidebar").classList.remove("open");});
window.addEventListener("hashchange",()=>showView(location.hash.slice(1)));
$("#date").value=todayISO();$("#monthFilter").value=todayISO().slice(0,7);$("#exportMonth").value=todayISO().slice(0,7);
$("#todayLabel").textContent=new Date().toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"});
renderCatalog();renderAll();
const firstView=location.hash.replace("#","");if(["registro","historial","concentrado"].includes(firstView))showView(firstView);
