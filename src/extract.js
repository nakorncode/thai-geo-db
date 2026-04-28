import ExcelJS from 'exceljs';
import { normalizeRecords, normalizeText } from './normalize.js';

const HEADER_ALIASES = {
  province: ['province', 'provincethai', 'จังหวัด'],
  district: ['district', 'districtthai', 'districtthaishort', 'อำเภอ', 'อําเภอ', 'เขต'],
  subdistrict: ['subdistrict', 'tambonthai', 'tambonthaishort', 'ตำบล', 'ตําบล', 'แขวง'],
  postalCode: ['postalcode', 'post_code', 'postcode', 'zip', 'zipcode', 'รหัสไปรษณีย์']
};

export async function extractPostalCodesFromXlsx(sourcePath, options = {}) {
  const tableName = options.tableName ?? options.table ?? 'รหัสไปรษณีย์';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(sourcePath);

  const table = findWorkbookTable(workbook, tableName);
  if (!table) {
    throw new Error(`Cannot find Excel table named "${tableName}".`);
  }

  const rows = readTableRows(table.worksheet, table.ref);
  if (rows.length === 0) {
    return [];
  }

  const headerMap = mapHeaders(rows[0]);
  const missing = ['province', 'district', 'subdistrict', 'postalCode'].filter((field) => headerMap[field] === undefined);
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(', ')}`);
  }

  const rawRows = rows.slice(1).map((row) => ({
    province: row[headerMap.province],
    district: row[headerMap.district],
    subdistrict: row[headerMap.subdistrict],
    postalCode: row[headerMap.postalCode]
  }));

  return normalizeRecords(rawRows);
}

function findWorkbookTable(workbook, tableName) {
  for (const worksheet of workbook.worksheets) {
    const table = getWorksheetTable(worksheet, tableName);
    if (table) {
      return {
        worksheet,
        ref: table.ref
      };
    }

    if (worksheet.name === tableName) {
      const firstTable = getFirstWorksheetTable(worksheet);
      if (firstTable) {
        return {
          worksheet,
          ref: firstTable.ref
        };
      }
    }
  }
  return null;
}

function getWorksheetTable(worksheet, tableName) {
  if (typeof worksheet.getTable === 'function') {
    try {
      const table = worksheet.getTable(tableName);
      const ref = table?.table?.ref ?? table?.table?.tableRef ?? table?.model?.ref ?? table?.ref;
      if (ref) {
        return { ref };
      }
    } catch {
      // Continue with model-based lookup for ExcelJS versions that expose tables differently.
    }
  }

  const modelTables = worksheet.model?.tables ?? [];
  for (const table of modelTables) {
    if (table.name === tableName || table.displayName === tableName) {
      return { ref: table.ref ?? table.tableRef };
    }
  }

  return null;
}

function getFirstWorksheetTable(worksheet) {
  const modelTable = worksheet.model?.tables?.[0];
  if (modelTable) {
    return { ref: modelTable.ref ?? modelTable.tableRef };
  }

  const tableNames = Object.keys(worksheet.tables ?? {});
  if (tableNames.length > 0 && typeof worksheet.getTable === 'function') {
    try {
      const table = worksheet.getTable(tableNames[0]);
      const ref = table?.table?.ref ?? table?.table?.tableRef ?? table?.model?.ref ?? table?.ref;
      if (ref) {
        return { ref };
      }
    } catch {
      // Ignore and let the caller report that no usable table was found.
    }
  }

  return null;
}

function readTableRows(worksheet, rangeRef) {
  const range = parseRange(rangeRef);
  const rows = [];

  for (let rowNumber = range.startRow; rowNumber <= range.endRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = [];
    for (let columnNumber = range.startCol; columnNumber <= range.endCol; columnNumber += 1) {
      values.push(normalizeCellValue(row.getCell(columnNumber).value));
    }
    rows.push(values);
  }

  return rows;
}

function mapHeaders(headerRow) {
  const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));
  const mapped = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const aliasSet = new Set(aliases.map(normalizeHeader));
    const index = normalizedHeaders.findIndex((header) => aliasSet.has(header));
    if (index !== -1) {
      mapped[field] = index;
    }
  }

  return mapped;
}

function normalizeHeader(value) {
  return normalizeText(value).toLowerCase().replace(/[\s_-]+/g, '');
}

function normalizeCellValue(value) {
  if (value && typeof value === 'object') {
    if ('text' in value) {
      return value.text;
    }
    if ('result' in value) {
      return value.result;
    }
    if ('richText' in value) {
      return value.richText.map((part) => part.text).join('');
    }
  }
  return value;
}

function parseRange(ref) {
  const match = String(ref).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!match) {
    throw new Error(`Unsupported table range: ${ref}`);
  }

  return {
    startCol: columnNameToNumber(match[1]),
    startRow: Number(match[2]),
    endCol: columnNameToNumber(match[3]),
    endRow: Number(match[4])
  };
}

function columnNameToNumber(name) {
  return name.toUpperCase().split('').reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}
