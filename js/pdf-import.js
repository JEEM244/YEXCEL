const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

const cleanText = value => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[\t\u00a0]+/g, " ")
  .replace(/ +/g, " ")
  .trim();

const normalize = value => cleanText(value).toLocaleLowerCase("es-MX");

function extractLabeledValue(text, labels) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const label of labels) {
    const re = new RegExp("^\\s*" + label + "\\s*(?:[:：-]\\s*|\\s{2,})(.*)$", "i");
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(re);
      if (match && match[1]?.trim()) return match[1].trim();
      // Some PDFs place the value on the next visual line.
      if (new RegExp("^\\s*" + label + "\\s*[:：-]?\\s*$", "i").test(lines[i]) && lines[i + 1]) {
        const next = lines[i + 1];
        if (!/^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ /]{2,}:?$/.test(next)) return next;
      }
    }
  }
  // Fallback for PDFs whose text layer puts several fields on one line.
  const flat = cleanText(text);
  for (const label of labels) {
    const re = new RegExp("(?:^|\\s)" + label + "\\s*[:：-]\\s*(.{1,100}?)(?=\\s+[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ /]{2,}\\s*[:：-]|$)", "i");
    const match = flat.match(re);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function findDate(text) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return [iso[1], iso[2].padStart(2, "0"), iso[3].padStart(2, "0")].join("-");
  const mx = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (mx) return [mx[3], mx[2].padStart(2, "0"), mx[1].padStart(2, "0")].join("-");
  const months = { enero:"01", febrero:"02", marzo:"03", abril:"04", mayo:"05", junio:"06", julio:"07", agosto:"08", septiembre:"09", setiembre:"09", octubre:"10", noviembre:"11", diciembre:"12" };
  const named = normalize(text).match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(20\d{2}))?/);
  if (named) return [(named[3] || String(new Date().getFullYear())), months[named[2]], named[1].padStart(2, "0")].join("-");
  return "";
}

function parseQuantity(raw) {
  if (!raw) return null;
  // Supports decimals with comma or point and thousands separators.
  let value = String(raw).trim().replace(/\s/g, "");
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(value)) value = value.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(?:,\d{3})+\.\d+$/.test(value)) value = value.replace(/,/g, "");
  else value = value.replace(",", ".");
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getQuantityForItem(text, description) {
  const escaped = description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const itemLine = new RegExp(escaped, "i");
  const unitPattern = "(?:kg|kgs|kilo(?:s)?|g|gr|gramos?|litros?|lts?|lt|piezas?|pz|paquetes?|pqte|sobres?|latas?|rollos?|mn)";
  for (let i = 0; i < lines.length; i++) {
    if (!itemLine.test(lines[i])) continue;
    // Common layouts: "Arroz 1.5 KG", "1,5 kg Arroz", or "Arroz    1,5".
    const after = lines[i].match(new RegExp(escaped + "[^\\d]{0,35}(\\d+(?:[.,]\\d+)?)\\s*(?:" + unitPattern + ")?", "i"));
    const before = lines[i].match(new RegExp("(\\d+(?:[.,]\\d+)?)\\s*(?:" + unitPattern + ")\\s*" + escaped, "i"));
    const quantity = parseQuantity(after?.[1] || before?.[1]);
    if (quantity !== null) return quantity;
    // Tables sometimes put the quantity in the next text-layer row.
    if (lines[i + 1] && /^\d+(?:[.,]\d+)?$/.test(lines[i + 1])) {
      const nextQuantity = parseQuantity(lines[i + 1]);
      if (nextQuantity !== null) return nextQuantity;
    }
  }
  // Search the full text only as a fallback; don't require newline characters
  // after normalization, since PDF text layers frequently collapse whitespace.
  const flat = cleanText(text);
  const after = flat.match(new RegExp(escaped + "\\s{1,12}(\\d+(?:[.,]\\d+)?)\\s*(?:" + unitPattern + ")?", "i"));
  const before = flat.match(new RegExp("(\\d+(?:[.,]\\d+)?)\\s*(?:" + unitPattern + ")\\s*" + escaped, "i"));
  return parseQuantity(after?.[1] || before?.[1]);
}

export async function parseFoodLogPdf(file, catalog) {
  if (!file || (file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf"))) {
    throw new TypeError("Selecciona un archivo PDF válido.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("El PDF supera el límite de 25 MB.");
  const pdfjs = await import(PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map();
    for (const item of content.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform?.[5] ?? 0);
      const line = rows.get(y) || [];
      line.push({ x: item.transform?.[4] ?? 0, text: item.str.trim() });
      rows.set(y, line);
    }
    pages.push([...rows.entries()].sort((a,b) => b[0]-a[0])
      .map(([,items]) => items.sort((a,b) => a.x-b.x).map(item => item.text).join("  "))
      .join("\n"));
  }
  const text = pages.join("\n");
  if (!text.trim()) throw new Error("No se encontró texto seleccionable. Si el PDF es un escaneo o una foto, necesita OCR antes de importarlo.");

  const date = findDate(text);
  const center = extractLabeledValue(text, ["centro(?: / casa club)?", "casa club", "nombre del centro"]);
  const cook = extractLabeledValue(text, ["encargado(?: de cocina)?", "responsable de cocina", "cocinero(?:a)?"]);
  const breakfasts = extractLabeledValue(text, ["desayunos otorgados", "desayunos"]);
  const mealsServed = extractLabeledValue(text, ["comidas otorgadas", "comidas servidas", "comidas"]);
  const menu = extractLabeledValue(text, ["men[uú]", "platillo"]);
  const water = extractLabeledValue(text, ["agua", "bebida"]);
  const fruit = extractLabeledValue(text, ["fruta del d[ií]a", "fruta"]);
  const items = [];
  for (const category of catalog || []) {
    for (const [description, unit] of category.items || []) {
      const quantity = getQuantityForItem(text, description);
      if (quantity !== null) items.push({ category: category.id, description, unit, quantity });
    }
  }
  const numberOrBlank = value => {
    const match = String(value).match(/\d+(?:[.,]\d+)?/);
    return match ? parseQuantity(match[0]) : "";
  };
  return {
    fields: { date, center, cook, breakfasts: numberOrBlank(breakfasts), mealsServed: numberOrBlank(mealsServed), menu, water, fruit },
    items, pageCount: pdf.numPages
  };
}
