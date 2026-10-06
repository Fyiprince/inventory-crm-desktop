const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const prisma = require('../prisma');

/*
|--------------------------------------------------------------------------
| Product Import Service
|--------------------------------------------------------------------------
|
| Supported:
| - Excel: .xlsx / .xls
| - CSV
| - PDF
|
| Expected product fields:
| SKU
| Name
| Description
| Unit
| Price
| Min Stock
| Current Stock
| Location
| Rack Number
| Category
| Supplier
|
|--------------------------------------------------------------------------
*/

function cleanValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeKey(key) {
  return cleanValue(key)
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^\w]/g, '');
}

function normalizeRow(row) {
  const normalized = {};

  for (const [key, value] of Object.entries(row || {})) {
    normalized[normalizeKey(key)] = value;
  }

  return normalized;
}

function getField(row, possibleKeys) {
  for (const key of possibleKeys) {
    const normalizedKey = normalizeKey(key);

    if (
      row[normalizedKey] !== undefined &&
      row[normalizedKey] !== null &&
      cleanValue(row[normalizedKey]) !== ''
    ) {
      return row[normalizedKey];
    }
  }

  return '';
}

function toNumber(value, defaultValue = 0) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return defaultValue;
  }

  const cleaned = String(value)
    .replace(/₹/g, '')
    .replace(/,/g, '')
    .replace(/%/g, '')
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : defaultValue;
}

function toInteger(value, defaultValue = 0) {
  const number = toNumber(value, defaultValue);

  return Math.max(0, Math.round(number));
}

/*
|--------------------------------------------------------------------------
| Extract Excel / CSV
|--------------------------------------------------------------------------
*/

function parseSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('Excel/CSV file does not contain any sheet');
  }

  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
  });

  return rows;
}

/*
|--------------------------------------------------------------------------
| Extract PDF
|--------------------------------------------------------------------------
*/

async function parsePDF(buffer) {
  const result = await pdfParse(buffer);

  const text = cleanValue(result.text);

  if (!text) {
    throw new Error(
      'PDF does not contain readable text. Scanned/image-only PDFs require OCR.'
    );
  }

  return text;
}

/*
|--------------------------------------------------------------------------
| Convert PDF text into product rows
|--------------------------------------------------------------------------
|
| We support common table-like PDF text.
|
| Example:
|
| SKU    Name              Unit   Price   Stock
| 001    Cement            pcs    250     50
| 002    Panel             pcs    620     70
|
|--------------------------------------------------------------------------
*/

function parsePDFProducts(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const rows = [];

  /*
   * Try to detect a header line.
   */

  const headerIndex = lines.findIndex((line) => {
    const lower = line.toLowerCase();

    return (
      lower.includes('sku') &&
      (
        lower.includes('name') ||
        lower.includes('product')
      )
    );
  });

  if (headerIndex >= 0) {
    const headerLine = lines[headerIndex];

    const headers = headerLine
      .split(/\s{2,}|\t+/)
      .map((x) => x.trim())
      .filter(Boolean);

    for (
      let i = headerIndex + 1;
      i < lines.length;
      i++
    ) {
      const line = lines[i];

      const values = line
        .split(/\s{2,}|\t+/)
        .map((x) => x.trim())
        .filter(Boolean);

      if (!values.length) continue;

      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }
  }

  /*
   * Fallback:
   *
   * If the PDF did not have a proper header,
   * try extracting SKU + product name from lines.
   */

  if (!rows.length) {
    for (const line of lines) {
      const match = line.match(
        /^([A-Za-z0-9._/-]+)\s{2,}(.+)$/
      );

      if (!match) continue;

      rows.push({
        SKU: match[1],
        Name: match[2],
      });
    }
  }

  return rows;
}

/*
|--------------------------------------------------------------------------
| Convert imported row into Product object
|--------------------------------------------------------------------------
*/

function convertRow(row) {
  const normalized = normalizeRow(row);

  const sku = cleanValue(
    getField(normalized, [
      'sku',
      'productsku',
      'itemcode',
      'itemid',
      'code',
      'productcode',
    ])
  );

  const name = cleanValue(
    getField(normalized, [
      'name',
      'productname',
      'product',
      'itemname',
      'item',
      'description',
    ])
  );

  const description = cleanValue(
    getField(normalized, [
      'description',
      'details',
      'remarks',
    ])
  );

  const unit = cleanValue(
    getField(normalized, [
      'unit',
      'uom',
      'unitofmeasure',
    ])
  ) || 'pcs';

  const price = toNumber(
    getField(normalized, [
      'price',
      'purchaseprice',
      'purchasecost',
      'cost',
      'unitcost',
      'rate',
    ]),
    0
  );

  const minStock = toInteger(
    getField(normalized, [
      'minstock',
      'minimumstock',
      'reorderlevel',
      'reorderpoint',
    ]),
    0
  );

  const currentStock = toInteger(
    getField(normalized, [
      'currentstock',
      'stock',
      'quantity',
      'qty',
      'openingstock',
    ]),
    0
  );

  const location = cleanValue(
    getField(normalized, [
      'location',
      'warehouse',
      'store',
    ])
  );

  const rackNumber = cleanValue(
    getField(normalized, [
      'racknumber',
      'rackno',
      'rack',
      'racknumber',
    ])
  );

  const categoryName = cleanValue(
    getField(normalized, [
      'category',
      'categoryname',
    ])
  );

  const supplierName = cleanValue(
    getField(normalized, [
      'supplier',
      'suppliername',
      'vendor',
      'vendorname',
    ])
  );

  return {
    sku,
    name,
    description,
    unit,
    price,
    minStock,
    currentStock,
    location,
    rackNumber,
    categoryName,
    supplierName,
  };
}

/*
|--------------------------------------------------------------------------
| Find Category
|--------------------------------------------------------------------------
*/

async function findCategoryId(categoryName, tx) {
  if (!categoryName) {
    return null;
  }

  const category = await tx.category.findFirst({
    where: {
      name: {
        equals: categoryName,
      },
    },
  });

  return category ? category.id : null;
}

/*
|--------------------------------------------------------------------------
| Find Supplier
|--------------------------------------------------------------------------
*/

async function findSupplierId(supplierName, tx) {
  if (!supplierName) {
    return null;
  }

  const supplier = await tx.supplier.findFirst({
    where: {
      name: {
        equals: supplierName,
      },
    },
  });

  return supplier ? supplier.id : null;
}

/*
|--------------------------------------------------------------------------
| Import Products
|--------------------------------------------------------------------------
*/

async function importProducts(rows) {
  if (!Array.isArray(rows)) {
    throw new Error('Invalid product data');
  }

  if (!rows.length) {
    throw new Error(
      'No products found in the imported file'
    );
  }

  const result = {
    totalRows: rows.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < rows.length; index++) {
      const rowNumber = index + 2;

      try {
        const product = convertRow(rows[index]);

        /*
         * SKU is required.
         */

        if (!product.sku) {
          result.skipped++;

          result.errors.push({
            row: rowNumber,
            message: 'SKU is missing',
          });

          continue;
        }

        /*
         * Product name is required.
         */

        if (!product.name) {
          result.skipped++;

          result.errors.push({
            row: rowNumber,
            message: 'Product name is missing',
          });

          continue;
        }

        /*
         * Find category / supplier if supplied.
         */

        const categoryId =
          await findCategoryId(
            product.categoryName,
            tx
          );

        const supplierId =
          await findSupplierId(
            product.supplierName,
            tx
          );

        /*
         * Check whether SKU already exists.
         */

        const existing =
          await tx.product.findUnique({
            where: {
              sku: product.sku,
            },
          });

        const data = {
          sku: product.sku,
          name: product.name,
          description:
            product.description || null,
          unit: product.unit || 'pcs',
          price: product.price,
          minStock: product.minStock,
          currentStock: product.currentStock,
          location:
            product.location || null,
          rackNumber:
            product.rackNumber || null,
          categoryId,
          supplierId,
        };

        /*
         * Existing SKU:
         * update the existing product.
         */

        if (existing) {
          await tx.product.update({
            where: {
              id: existing.id,
            },
            data,
          });

          result.updated++;
        } else {
          /*
           * New SKU:
           * create a new product.
           */

          await tx.product.create({
            data,
          });

          result.imported++;
        }
      } catch (error) {
        result.skipped++;

        result.errors.push({
          row: rowNumber,
          message:
            error?.message ||
            'Failed to import row',
        });
      }
    }
  });

  return result;
}

/*
|--------------------------------------------------------------------------
| Main File Parser
|--------------------------------------------------------------------------
*/

async function parseImportFile(buffer, filename) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid uploaded file');
  }

  const extension = String(
    filename || ''
  )
    .toLowerCase()
    .split('.')
    .pop();

  /*
   * Excel / CSV
   */

  if (
    extension === 'xlsx' ||
    extension === 'xls' ||
    extension === 'csv'
  ) {
    return parseSpreadsheet(buffer);
  }

  /*
   * PDF
   */

  if (extension === 'pdf') {
    const text = await parsePDF(buffer);

    return parsePDFProducts(text);
  }

  throw new Error(
    'Unsupported file type. Please upload XLSX, XLS, CSV or PDF.'
  );
}

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
*/

async function importFromFile(
  buffer,
  filename
) {
  const rows = await parseImportFile(
    buffer,
    filename
  );

  return importProducts(rows);
}

module.exports = {
  parseImportFile,
  importProducts,
  importFromFile,
};