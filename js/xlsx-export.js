const encoder = new TextEncoder();

const xmlEscape = (value) => String(value == null ? "" : value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("es-MX");

function columnName(number) {
  let value = number;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function excelSerial(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ""));
  if (!match) return null;
  return Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000) + 25569;
}

function monthLabel(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return String(month || "");
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1, 12)
    .toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function textCell(value, style) {
  return { type: "text", value: value == null ? "" : String(value), style: style == null ? 4 : style };
}
function numberCell(value, style) {
  if (value === "" || value == null || !Number.isFinite(Number(value))) {
    return { type: "blank", value: null, style: style == null ? 6 : style };
  }
  return { type: "number", value: Number(value), style: style == null ? 6 : style };
}
function dateCell(isoDate, style) {
  const serial = excelSerial(isoDate);
  return serial == null ? { type: "blank", value: null, style: style == null ? 10 : style } :
    { type: "number", value: serial, style: style == null ? 10 : style };
}
function formulaCell(formula, cachedValue, style) {
  return { type: "formula", formula, value: cachedValue == null ? null : Number(cachedValue), style: style == null ? 7 : style };
}
function blankCell(style) {
  return { type: "blank", value: null, style: style == null ? 5 : style };
}

function cellXml(cell, reference) {
  const style = cell && cell.style != null ? cell.style : 5;
  if (!cell || cell.type === "blank" || cell.value === "") {
    return '<c r="' + reference + '" s="' + style + '"/>';
  }
  if (cell.type === "formula") {
    const empty = cell.value == null || !Number.isFinite(cell.value);
    return '<c r="' + reference + '" s="' + style + '"' + (empty ? ' t="str"' : "") + '><f>' +
      xmlEscape(cell.formula) + '</f><v>' + (empty ? "" : String(cell.value)) + '</v></c>';
  }
  if (cell.type === "number") {
    return '<c r="' + reference + '" s="' + style + '"><v>' + String(cell.value) + '</v></c>';
  }
  return '<c r="' + reference + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' +
    xmlEscape(cell.value) + '</t></is></c>';
}

function worksheetXml(options) {
  const rows = options.rows || [];
  const maxColumn = Math.max(1, options.columnWidths.length);
  const lastCell = columnName(maxColumn) + Math.max(1, rows.length);
  const rowXml = rows.map((row, index) => {
    const rowNumber = index + 1;
    const height = row.height ? ' ht="' + row.height + '" customHeight="1"' : "";
    const cells = (row.cells || []).map((cell, columnIndex) => cellXml(cell, columnName(columnIndex + 1) + rowNumber)).join("");
    return '<row r="' + rowNumber + '"' + height + '>' + cells + '</row>';
  }).join("");
  const cols = options.columnWidths.map((width, index) => '<col min="' + (index + 1) + '" max="' + (index + 1) + '" width="' +
    width + '" customWidth="1"/>').join("");
  const merges = (options.merges || []).map(range => '<mergeCell ref="' + range + '"/>').join("");
  const mergeBlock = merges ? '<mergeCells count="' + options.merges.length + '">' + merges + '</mergeCells>' : "";
  const freeze = options.freezeRows || 0;
  const views = freeze ?
    '<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="' + freeze +
      '" topLeftCell="A' + (freeze + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' :
    '<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>';
  const filter = options.autoFilter ? '<autoFilter ref="' + options.autoFilter + '"/>' : "";
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<dimension ref="A1:' + lastCell + '"/>' + views +
    '<sheetFormatPr defaultRowHeight="19"/><cols>' + cols + '</cols>' +
    '<sheetData>' + rowXml + '</sheetData>' + filter + mergeBlock +
    '<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>';
}

function stylesXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="3"><numFmt numFmtId="164" formatCode="0.##"/><numFmt numFmtId="165" formatCode="d-mmm"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy"/></numFmts>' +
    '<fonts count="5">' +
      '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>' +
      '<font><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/><family val="2"/></font>' +
    '</fonts>' +
    '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right>' +
      '<top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="13">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="165" fontId="2" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function concatBytes(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function zipStored(files) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034B50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 33, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014B50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, localOffset, true);
    central.set(name, 46);

    localParts.push(local, data);
    centralParts.push(central);
    localOffset += local.length + data.length;
  }
  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054B50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralDirectory.length, true);
  ev.setUint32(16, localOffset, true);
  ev.setUint16(20, 0, true);
  return concatBytes(localParts.concat([centralDirectory, end]));
}

function catalogRows(catalog, logs, monthLogs) {
  const result = [];
  const byDescription = new Map();
  const categoryNames = new Map((catalog || []).map(category => [category.id, category.label]));
  (catalog || []).forEach(category => {
    (category.items || []).forEach(pair => {
      const item = {
        categoryId: category.id,
        category: category.label,
        description: String(pair[0] || ""),
        unit: String(pair[1] || ""),
        key: normalize(category.id) + "|" + normalize(pair[0]) + "|" + normalize(pair[1])
      };
      result.push(item);
      byDescription.set(normalize(item.description), item);
    });
  });
  const extras = new Map();
  (monthLogs || []).forEach(log => (log.items || []).forEach(source => {
    const description = String(source.description || "").trim();
    if (!description) return;
    const known = byDescription.get(normalize(description));
    if (known) return;
    const categoryId = String(source.category || "otros");
    const key = normalize(categoryId) + "|" + normalize(description) + "|" + normalize(source.unit);
    if (!extras.has(key)) {
      const item = {
        categoryId,
        category: categoryNames.get(categoryId) || (categoryId === "otros" ? "Otros insumos" : categoryId),
        description,
        unit: String(source.unit || ""),
        key
      };
      extras.set(key, item);
    }
  }));
  result.push(...extras.values());
  return result;
}

export function buildFoodLogXlsx(logsInput, monthInput, catalogInput) {
  const logs = (Array.isArray(logsInput) ? logsInput : []).slice()
    .filter(log => log && /^\d{4}-\d{2}-\d{2}$/.test(String(log.date || "")))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!logs.length) throw new TypeError("No hay registros para exportar.");
  const month = /^\d{4}-\d{2}$/.test(String(monthInput || "")) ? monthInput : String(logs[logs.length - 1].date).slice(0, 7);
  const monthLogs = logs.filter(log => String(log.date).startsWith(month));
  const dates = Array.from(new Set(monthLogs.map(log => log.date))).sort();
  const itemRows = catalogRows(catalogInput, logs, monthLogs);
  const quantities = new Map();
  const catalogLookup = new Map();
  itemRows.forEach(item => catalogLookup.set(normalize(item.description), item));
  monthLogs.forEach(log => {
    (log.items || []).forEach(source => {
      const found = catalogLookup.get(normalize(source.description || ""));
      const categoryId = String(source.category || "otros");
      const description = String(source.description || "").trim();
      const unit = String(source.unit || "");
      const key = found ? found.key : normalize(categoryId) + "|" + normalize(description) + "|" + normalize(unit);
      const mapKey = key + "\u0000" + log.date;
      const value = Number(source.quantity);
      if (!Number.isFinite(value)) return;
      quantities.set(mapKey, (quantities.get(mapKey) || 0) + value);
    });
  });

  const centers = Array.from(new Set((monthLogs.length ? monthLogs : logs).map(log => String(log.center || "").trim()).filter(Boolean)));
  const centerLabel = centers.length === 1 ? centers[0] : (centers.length > 1 ? "Varios centros" : "Centro sin nombre");
  const lastColumn = 2 + dates.length;
  const summaryWidths = [38].concat(dates.map(() => 12), [14]);
  const summaryRows = [];
  summaryRows.push({ height: 31, cells: [textCell("REGISTRO DE ALIMENTOS", 1)] });
  summaryRows.push({ height: 23, cells: [textCell(centerLabel + " · " + monthLabel(month), 2)] });
  summaryRows.push({ height: 20, cells: [textCell("Concentrado mensual por insumo. Las cantidades se suman automáticamente en la columna TOTAL.", 12)] });
  summaryRows.push({ height: 8, cells: [] });
  const headers = [textCell("Descripción", 3)];
  dates.forEach(date => headers.push(dateCell(date, 8)));
  headers.push(textCell("TOTAL", 3));
  summaryRows.push({ height: 30, cells: headers });

  const dataStartRow = 6;
  itemRows.forEach((item, itemIndex) => {
    const rowNumber = dataStartRow + itemIndex;
    const cells = [textCell(item.description + (item.unit ? " (" + item.unit + ")" : ""), 4)];
    let rowTotal = 0;
    dates.forEach(date => {
      const value = quantities.get(item.key + "\u0000" + date);
      if (value == null) cells.push(blankCell(6));
      else {
        rowTotal += value;
        cells.push(numberCell(value, 6));
      }
    });
    if (dates.length) {
      const start = "B" + rowNumber;
      const end = columnName(1 + dates.length) + rowNumber;
      cells.push(formulaCell('IF(COUNT(' + start + ':' + end + ')=0,"",SUM(' + start + ':' + end + '))', rowTotal === 0 &&
        !dates.some(date => quantities.has(item.key + "\u0000" + date)) ? null : rowTotal, 7));
    } else {
      cells.push(blankCell(7));
    }
    summaryRows.push({ cells });
  });

  const summaryLastRow = summaryRows.length;
  const summary = worksheetXml({
    rows: summaryRows,
    columnWidths: summaryWidths,
    merges: ["A1:" + columnName(lastColumn) + "1", "A2:" + columnName(lastColumn) + "2", "A3:" + columnName(lastColumn) + "3"],
    freezeRows: 5,
    autoFilter: "A5:" + columnName(lastColumn) + summaryLastRow
  });

  const dailyRows = [];
  const dailyWidths = [13, 29, 24, 17, 17, 42, 18, 18, 25, 30, 13, 14];
  dailyRows.push({ height: 31, cells: [textCell("REGISTROS DIARIOS DE ALIMENTOS", 1)] });
  dailyRows.push({ height: 23, cells: [textCell("Historial completo de todos los registros guardados en YEXCEL", 2)] });
  dailyRows.push({ height: 8, cells: [] });
  dailyRows.push({ height: 30, cells: [
    textCell("Fecha", 3), textCell("Centro / Casa club", 3), textCell("Encargado de cocina", 3),
    textCell("Desayunos otorgados", 3), textCell("Comidas otorgadas", 3), textCell("Menú", 3),
    textCell("Agua", 3), textCell("Fruta", 3), textCell("Categoría", 3), textCell("Descripción", 3),
    textCell("Cantidad", 3), textCell("Unidad", 3)
  ] });
  const allCategoryLabels = new Map((catalogInput || []).map(category => [category.id, category.label]));
  logs.forEach(log => {
    const items = Array.isArray(log.items) && log.items.length ? log.items : [null];
    items.forEach(item => {
      const categoryId = item ? String(item.category || "otros") : "";
      const categoryLabel = item ? (allCategoryLabels.get(categoryId) || categoryId) : "";
      dailyRows.push({ cells: [
        dateCell(log.date, 10),
        textCell(log.center || "", 4),
        textCell(log.cook || "", 4),
        numberCell(log.breakfasts, 6),
        numberCell(log.mealsServed, 6),
        textCell(log.menu || "", 4),
        textCell(log.water || "", 4),
        textCell(log.fruit || "", 4),
        textCell(categoryLabel, 4),
        textCell(item ? item.description || "" : "", 4),
        numberCell(item ? item.quantity : "", 6),
        textCell(item ? item.unit || "" : "", 4)
      ] });
    });
  });
  const dailyLastRow = dailyRows.length;
  const daily = worksheetXml({
    rows: dailyRows,
    columnWidths: dailyWidths,
    merges: ["A1:L1", "A2:L2"],
    freezeRows: 4,
    autoFilter: "A4:L" + dailyLastRow
  });

  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';
  const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Concentrado" sheetId="1" r:id="rId1"/><sheet name="Registros diarios" sheetId="2" r:id="rId2"/></sheets>' +
    '<calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>';
  const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  return zipStored([
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: rootRels },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/styles.xml", content: stylesXml() },
    { name: "xl/worksheets/sheet1.xml", content: summary },
    { name: "xl/worksheets/sheet2.xml", content: daily }
  ]);
}
