const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

const cleanText = value => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[\t\u00a0]+/g, " ")
  .replace(/ +/g, " ")
  .trim();

const normalize = value => cleanText(value).toLocaleLowerCase("es-MX");

function extractLabeledValue(text, labels) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const label of labels) {
    const re = new RegExp("^\\s*" + label + "\\s*(?:[:：_-]\\s*|\\s{2,})(.*)$", "i");
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(re);
      if (match && match[1]?.trim()) return match[1].trim().replace(/^[_: -]+/, "").trim();
      if (new RegExp("^\\s*" + label + "\\s*[:：_-]?\\s*$", "i").test(lines[i]) && lines[i + 1]) {
        const next = lines[i + 1];
        if (!/^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ /]{2,}:?$/.test(next)) return next;
      }
    }
  }
  const flat = cleanText(text);
  for (const label of labels) {
    const re = new RegExp("(?:^|\\s)" + label + "\\s*[:：_-]\\s*(.{1,100}?)(?=\\s+[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ /]{2,}\\s*[:：_-]|$)", "i");
    const match = flat.match(re);
    if (match?.[1]) return match[1].trim().replace(/^[_: -]+/, "");
  }
  return "";
}

function findDate(text) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return [iso[1], iso[2].padStart(2, "0"), iso[3].padStart(2, "0")].join("-");
  const mx = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (mx) return [mx[3], mx[2].padStart(2, "0"), mx[1].padStart(2, "0")].join("-");
  const months = { enero:"01", febrero:"02", marzo:"03", abril:"04", mayo:"05", junio:"06", julio:"07", agosto:"08", septiembre:"09", setiembre:"09", octubre:"10", noviembre:"11", diciembre:"12" };
  const normalized = normalize(text);
  const named = normalized.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(20\d{2}))?/);
  if (named) return [(named[3] || String(new Date().getFullYear())), months[named[2]], named[1].padStart(2, "0")].join("-");
  const labeled = normalized.match(/fecha\s*[:_-]?\s*(\d{1,2})\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/);
  if (labeled) return [String(new Date().getFullYear()), months[labeled[2]], labeled[1].padStart(2, "0")].join("-");
  return "";
}

function parseQuantity(raw) {
  if (!raw) return null;
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
    const after = lines[i].match(new RegExp(escaped + "[^\\d]{0,35}(\\d+(?:[.,]\\d+)?)\\s*(?:" + unitPattern + ")?", "i"));
    const before = lines[i].match(new RegExp("(\\d+(?:[.,]\\d+)?)\\s*(?:" + unitPattern + ")\\s*" + escaped, "i"));
    const quantity = parseQuantity(after?.[1] || before?.[1]);
    if (quantity !== null) return quantity;
    if (lines[i + 1] && /^\d+(?:[.,]\d+)?$/.test(lines[i + 1])) {
      const nextQuantity = parseQuantity(lines[i + 1]);
      if (nextQuantity !== null) return nextQuantity;
    }
  }
  const flat = cleanText(text);
  const after = flat.match(new RegExp(escaped + "\\s{1,18}(\\d+(?:[.,]\\d+)?)\\s*(?:" + unitPattern + ")?", "i"));
  const before = flat.match(new RegExp("(\\d+(?:[.,]\\d+)?)\\s*(?:" + unitPattern + ")\\s*" + escaped, "i"));
  return parseQuantity(after?.[1] || before?.[1]);
}

async function extractPdfText(pdf, pdfjs, onProgress) {
  const pages = [];
  const needsOCR = [];
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
    const pageText = [...rows.entries()].sort((a,b) => b[0]-a[0])
      .map(([,items]) => items.sort((a,b) => a.x-b.x).map(item => item.text).join("  "))
      .join("\n");
    pages.push(pageText);
    if (pageText.replace(/\s/g, "").length <= 30) needsOCR.push(pageNumber - 1);
  }
  if (!needsOCR.length) return { pages, ocr: false };

  onProgress?.("El PDF contiene páginas escaneadas. Activando reconocimiento OCR en español…");
  let tesseract = window.Tesseract;
  if (typeof tesseract?.createWorker !== "function") {
    try {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-yexcel-tesseract="true"]');
        if (existing && window.Tesseract?.createWorker) return resolve();
        if (existing) {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", () => reject(new Error("script load failed")), { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = TESSERACT_URL;
        script.async = true;
        script.dataset.yexcelTesseract = "true";
        script.onload = resolve;
        script.onerror = () => reject(new Error("script load failed"));
        document.head.appendChild(script);
      });
      tesseract = window.Tesseract;
    } catch {
      throw new Error("No se pudo cargar el motor OCR. Revisa tu conexión a internet y vuelve a intentarlo.");
    }
  }
  if (typeof tesseract?.createWorker !== "function") {
    throw new Error("Se cargó el OCR, pero no se encontró su función de reconocimiento. Actualiza la página e inténtalo de nuevo.");
  }
  const worker = await tesseract.createWorker("spa", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    workerBlobURL: true,
    logger: message => {
      if (message.status === "recognizing text") {
        onProgress?.("Aplicando OCR en español… " + Math.round((message.progress || 0) * 100) + "%");
      }
    }
  });
  try {
    for (const index of needsOCR) {
      onProgress?.("Reconociendo página " + (index + 1) + " de " + pdf.numPages + "…");
      const page = await pdf.getPage(index + 1);
      const viewport = page.getViewport({ scale: 2.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      await page.render({ canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      const words = (result.data.words || []).filter(word => word.text?.trim() && word.bbox);
      if (words.length) {
        const sorted = words.map(word => ({
          text: word.text.trim(),
          x: word.bbox.x0,
          y: (word.bbox.y0 + word.bbox.y1) / 2
        })).sort((a, b) => a.y - b.y || a.x - b.x);
        const rows = [];
        for (const word of sorted) {
          let row = rows.find(candidate => Math.abs(candidate.y - word.y) <= 13);
          if (!row) {
            row = { y: word.y, words: [] };
            rows.push(row);
          }
          row.words.push(word);
          row.y = row.words.reduce((sum, item) => sum + item.y, 0) / row.words.length;
        }
        pages[index] = rows.sort((a, b) => a.y - b.y)
          .map(row => row.words.sort((a, b) => a.x - b.x).map(word => word.text).join("  "))
          .join("\\n");
      } else {
        pages[index] = result.data.text || "";
      }
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }
  if (!pages.some(pageText => pageText.replace(/\s/g, "").length)) {
    throw new Error("No se pudo reconocer texto en el PDF. Intenta subir un escaneo más nítido.");
  }
  return { pages, ocr: true };
}

export async function parseFoodLogPdf(file, catalog, onProgress) {
  if (!file || (file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf"))) {
    throw new TypeError("Selecciona un archivo PDF válido.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("El PDF supera el límite de 25 MB.");
  const pdfjs = await import(PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const extracted = await extractPdfText(pdf, pdfjs, onProgress);
  const numberOrBlank = value => {
    const match = String(value).match(/\d+(?:[.,]\d+)?/);
    return match ? parseQuantity(match[0]) : "";
  };
  const records = extracted.pages.map((text, index) => {
    const date = findDate(text);
    const center = extractLabeledValue(text, ["centro(?: / casa club)?", "casa club", "nombre del centro"]) ||
      (normalize(text).includes("caminando juntos") ? "Casa club: Caminando Juntos" : "");
    const cook = extractLabeledValue(text, ["encargado(?: de cocina)?", "responsable de cocina", "cocinero(?:a)?"]);
    const breakfasts = extractLabeledValue(text, ["desayunos otorgados", "desayunos"]);
    const mealsServed = extractLabeledValue(text, ["comidas otorgadas", "comidas servidas", "comidas"]);
    const menu = extractLabeledValue(text, ["men[uú]", "platillo"]);
    const water = extractLabeledValue(text, ["agua", "bebida"]);
    const fruit = extractLabeledValue(text, ["fruta del d[ií]a", "fruta"]);
    const items = [];
    const unrecognizedItems = [];
    for (const category of catalog || []) {
      for (const [description, unit] of category.items || []) {
        const quantity = getQuantityForItem(text, description);
        if (quantity !== null) {
          items.push({ category: category.id, description, unit, quantity });
        } else {
          const escaped = description.replace(/[.*+?^${}()|[\]\\]/g, "\\    const items = [];
    for (const category of catalog || []) {
      for (const [description, unit] of category.items || []) {
        const quantity = getQuantityForItem(text, description);
        if (quantity !== null) items.push({ category: category.id, description, unit, quantity });
      }
    }
    const fields = {");
          const itemMentioned = new RegExp("(^|[^\\p{L}])" + escaped + "(?=$|[^\\p{L}])", "iu").test(text);
          if (itemMentioned) {
            unrecognizedItems.push({
              category: category.id,
              description,
              unit,
              quantity: "",
              recognitionStatus: "unrecognized"
            });
          }
        }
      }
    }
    const fields = {
      date, center, cook,
      breakfasts: numberOrBlank(breakfasts),
      mealsServed: numberOrBlank(mealsServed),
      menu, water, fruit
    };
    const fieldCount = Object.values(fields).filter(value => value !== "" && value != null).length;
    return { pageNumber: index + 1, fields, items, unrecognizedItems, hasData: fieldCount > 0 || items.length > 0 || unrecognizedItems.length > 0 };
  }).filter(record => record.hasData);

  if (!records.length) {
    throw new Error("No se detectaron datos en ninguna página. Revisa la calidad del escaneo.");
  }
  const fallbackDate = records.find(record => record.fields.date)?.fields.date || "";
  const fallbackCenter = records.find(record => record.fields.center)?.fields.center || "Casa club: Caminando Juntos";
  for (const record of records) {
    if (!record.fields.date) record.fields.date = fallbackDate;
    if (!record.fields.center) record.fields.center = fallbackCenter;
  }
  return {
    records,
    pageCount: pdf.numPages,
    usedOCR: extracted.ocr,
    skippedPages: pdf.numPages - records.length
  };
}
