const { z } = require('zod');

const categoryService = require('../services/categoryService');
const supplierService = require('../services/supplierService');
const projectService = require('../services/projectService');
const productService = require('../services/productService');
const productImportService = require('../services/productImportService');
const transactionService = require('../services/transactionService');
const reportService = require('../services/reportService');

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Schemas

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  skuPrefix: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9_-]+-?$/),
});

const supplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(''))
    .nullable()
    .optional(),
  address: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
});

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z
    .enum(['active', 'completed', 'on-hold'])
    .optional(),
});

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  unit: z.string().optional().default('pcs'),
  price: z.coerce.number().min(0).optional().default(0),
  minStock: z.coerce.number().int().min(0).optional().default(0),
  currentStock: z.coerce.number().int().min(0).optional().default(0),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  rackNumber: z.string().optional().nullable(),
});

/*
 * Stock In
 *
 * Supports:
 * - GST Percentage
 * - GST Type
 * - CGST Percentage
 * - CGST Amount
 * - Transportation Charges
 * - GST Amount
 * - Total Amount
 */
const stockInSchema = z.object({
  productId: z.string().min(1),

  quantity: z.coerce
    .number()
    .int()
    .positive(),

  supplierId: z.string().optional().nullable(),

  // Storage location for the product. When supplied during Stock In,
  // these values become the product's current storage location.
  location: z.string().optional().nullable(),
  rackNumber: z.string().optional().nullable(),

  unitCost: z.coerce
    .number()
    .min(0)
    .optional()
    .nullable(),

  // GST details
  gstPercentage: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(0),

  gstType: z
    .enum([
      'CGST',
      'SGST',
      'IGST',
      'UTGST',
    ])
    .optional()
    .default('CGST'),

  // CGST details
  // When GST Type is CGST, backend will derive this
  // from gstPercentage for consistency.
  cgstPercentage: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),

  cgstAmount: z.coerce
    .number()
    .min(0)
    .optional()
    .nullable(),

  gstAmount: z.coerce
    .number()
    .min(0)
    .optional()
    .nullable(),

  // Transportation
  transportationCharges: z.coerce
    .number()
    .min(0)
    .optional()
    .nullable(),

  totalAmount: z.coerce
    .number()
    .min(0)
    .optional()
    .nullable(),

  reference: z.string().optional().nullable(),

  note: z.string().optional().nullable(),

  date: z.string().optional().nullable(),
});

/*
 * IMPORTANT:
 * unitCost is required for Stock Out.
 * This allows the Stock Out price to reach
 * transactionService and be saved in Transaction.unitCost.
 */
const stockOutSchema = z.object({
  productId: z.string().min(1),

  quantity: z.coerce
    .number()
    .int()
    .positive(),

  unitCost: z.coerce
    .number()
    .min(0)
    .optional(),

  projectId: z.string().optional().nullable(),

  stockOutBy: z.string().min(1, 'Stock Out By is required'),

  note: z.string().optional(),

  date: z.string().optional(),
});

module.exports = {
  schemas: {
    categorySchema,
    supplierSchema,
    projectSchema,
    productSchema,
    stockInSchema,
    stockOutSchema,
  },

  // Categories

  listCategories: wrap(async (req, res) =>
    res.json(await categoryService.list(req.query))
  ),

  allCategories: wrap(async (req, res) =>
    res.json(await categoryService.getAll())
  ),

  getCategory: wrap(async (req, res) => {
    const item = await categoryService.getById(
      req.params.id
    );

    if (!item) {
      return res
        .status(404)
        .json({ error: 'Not found' });
    }

    res.json(item);
  }),

  createCategory: wrap(async (req, res) =>
    res
      .status(201)
      .json(await categoryService.create(req.body))
  ),

  updateCategory: wrap(async (req, res) =>
    res.json(
      await categoryService.update(
        req.params.id,
        req.body
      )
    )
  ),

  deleteCategory: wrap(async (req, res) => {
    await categoryService.remove(req.params.id);
    res.json({ success: true });
  }),

  // Suppliers

  listSuppliers: wrap(async (req, res) =>
    res.json(await supplierService.list(req.query))
  ),

  allSuppliers: wrap(async (req, res) =>
    res.json(await supplierService.getAll())
  ),

  getSupplier: wrap(async (req, res) => {
    const item = await supplierService.getById(
      req.params.id
    );

    if (!item) {
      return res
        .status(404)
        .json({ error: 'Not found' });
    }

    res.json(item);
  }),

  createSupplier: wrap(async (req, res) =>
    res
      .status(201)
      .json(await supplierService.create(req.body))
  ),

  updateSupplier: wrap(async (req, res) =>
    res.json(
      await supplierService.update(
        req.params.id,
        req.body
      )
    )
  ),

  deleteSupplier: wrap(async (req, res) => {
    await supplierService.remove(req.params.id);
    res.json({ success: true });
  }),

  // Projects

  listProjects: wrap(async (req, res) =>
    res.json(await projectService.list(req.query))
  ),

  allProjects: wrap(async (req, res) =>
    res.json(await projectService.getAll())
  ),

  getProject: wrap(async (req, res) => {
    const item = await projectService.getById(
      req.params.id
    );

    if (!item) {
      return res
        .status(404)
        .json({ error: 'Not found' });
    }

    res.json(item);
  }),

  createProject: wrap(async (req, res) =>
    res
      .status(201)
      .json(await projectService.create(req.body))
  ),

  updateProject: wrap(async (req, res) =>
    res.json(
      await projectService.update(
        req.params.id,
        req.body
      )
    )
  ),

  deleteProject: wrap(async (req, res) => {
    await projectService.remove(req.params.id);
    res.json({ success: true });
  }),

  // Products

  listProducts: wrap(async (req, res) =>
    res.json(await productService.list(req.query))
  ),

  allProducts: wrap(async (req, res) =>
    res.json(await productService.getAll())
  ),

  getProduct: wrap(async (req, res) => {
    const item = await productService.getById(
      req.params.id
    );

    if (!item) {
      return res
        .status(404)
        .json({ error: 'Not found' });
    }

    res.json(item);
  }),

  createProduct: wrap(async (req, res) =>
    res
      .status(201)
      .json(await productService.create(req.body))
  ),

  updateProduct: wrap(async (req, res) =>
    res.json(
      await productService.update(
        req.params.id,
        req.body
      )
    )
  ),

  deleteProduct: wrap(async (req, res) => {
    await productService.remove(req.params.id);
    res.json({ success: true });
  }),

  lowStockProducts: wrap(async (req, res) =>
    res.json(await productService.lowStock())
  ),
  importProducts: wrap(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'Please upload an Excel, CSV or PDF file',
    });
  }

  const result =
    await productImportService.importFromFile(
      req.file.buffer,
      req.file.originalname
    );

  res.json({
    success: true,
    ...result,
  });
}),

  // Transactions

  listTransactions: wrap(async (req, res) =>
    res.json(await transactionService.list(req.query))
  ),

  stockIn: wrap(async (req, res) =>
    res
      .status(201)
      .json(await transactionService.stockIn(req.body))
  ),

  stockOut: wrap(async (req, res) =>
    res
      .status(201)
      .json(await transactionService.stockOut(req.body))
  ),

  recentTransactions: wrap(async (req, res) => {
    const limit =
      parseInt(req.query.limit, 10) || 10;

    res.json(
      await transactionService.recent(limit)
    );
  }),

  // Reports

  summary: wrap(async (req, res) =>
    res.json(await reportService.summary())
  ),

  monthlyMovement: wrap(async (req, res) => {
    const months =
      parseInt(req.query.months, 10) || 6;

    res.json(
      await reportService.monthlyMovement(months)
    );
  }),

  projectUsage: wrap(async (req, res) =>
    res.json(await reportService.projectUsage())
  ),

  topProducts: wrap(async (req, res) => {
    const limit =
      parseInt(req.query.limit, 10) || 10;

    res.json(
      await reportService.topProducts(limit)
    );
  }),
};