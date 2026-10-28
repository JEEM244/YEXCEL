const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

const normalize = value => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-MX").replace(/\s+/g, " ").trim();

function extractLabeledValue(text, labels) {
  for (const label of labels) {
    const re = new RegExp("(?:^|\\n)\\s*" + label + "\\s*[:：-]\\s*([^\\n]+)", "im");
    const match = text.match(re);
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

function getQuantityForItem(text, description) {
  const escaped = description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped + "[^\\d\\n]{0,35}?(\\d+(?:[.,]\\d+)?)|(?:^|\\n)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:kg|kgs|kilo|kilos|litros?|piezas?|paquetes?|pqte|sobres?|latas?|rollos?|mn)\\s+" + escaped, "i");
  const match = text.match(re);
  const raw = match?.[1] || match?.[2];
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
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
  const normalizedText = normalize(text);
  for (const category of catalog || []) {
    for (const [description, unit] of category.items || []) {
      const quantity = getQuantityForItem(normalizedText, normalize(description));
      if (quantity !== null) items.push({ category: category.id, description, unit, quantity });
    }
  }
  const numberOrBlank = value => {
    const match = value.match(/\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(",", ".")) : "";
  };
  return {
    fields: { date, center, cook, breakfasts: numberOrBlank(breakfasts), mealsServed: numberOrBlank(mealsServed), menu, water, fruit },
    items, pageCount: pdf.numPages
  };
}
