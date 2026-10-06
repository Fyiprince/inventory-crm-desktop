const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const c = require('../controllers');
const { validate } = require('../middleware/validate');
const prisma = require('../prisma');

const router = express.Router();
const { schemas } = c;

// =====================================================
// PRODUCT IMPORT FILE UPLOAD
// =====================================================

// Keep uploaded file in memory.
// This is suitable because we are directly processing
// the Excel / CSV / PDF file and don't need to save it.
const productImportStorage = multer.memoryStorage();

const productImportUpload = multer({
  storage: productImportStorage,

  limits: {
    // Maximum import file size = 10 MB
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      '.xlsx',
      '.xls',
      '.csv',
      '.pdf',
    ];

    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error(
          'Only Excel (.xlsx, .xls), CSV (.csv), or PDF (.pdf) files are allowed'
        )
      );
    }

    cb(null, true);
  },
});

// =====================================================
// HEALTH
// =====================================================

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'inventory-crm',
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
  });
});

// =====================================================
// CATEGORIES
// =====================================================

router.get('/categories', c.listCategories);

router.get('/categories/all', c.allCategories);

router.get('/categories/:id', c.getCategory);

router.post(
  '/categories',
  validate(schemas.categorySchema),
  c.createCategory
);

router.put(
  '/categories/:id',
  validate(schemas.categorySchema),
  c.updateCategory
);

router.delete(
  '/categories/:id',
  c.deleteCategory
);

// =====================================================
// SUPPLIERS
// =====================================================

router.get('/suppliers', c.listSuppliers);

router.get('/suppliers/all', c.allSuppliers);

router.get('/suppliers/:id', c.getSupplier);

router.post(
  '/suppliers',
  validate(schemas.supplierSchema),
  c.createSupplier
);

router.put(
  '/suppliers/:id',
  validate(schemas.supplierSchema),
  c.updateSupplier
);

router.delete(
  '/suppliers/:id',
  c.deleteSupplier
);

// =====================================================
// PROJECTS
// =====================================================

router.get('/projects', c.listProjects);

router.get('/projects/all', c.allProjects);

router.get('/projects/:id', c.getProject);

router.post(
  '/projects',
  validate(schemas.projectSchema),
  c.createProject
);

router.put(
  '/projects/:id',
  validate(schemas.projectSchema),
  c.updateProject
);

router.delete(
  '/projects/:id',
  c.deleteProject
);

// =====================================================
// PRODUCTS
// =====================================================

router.get('/products', c.listProducts);

router.get('/products/all', c.allProducts);

router.get(
  '/products/low-stock',
  c.lowStockProducts
);

router.get(
  '/products/:id',
  c.getProduct
);

router.post(
  '/products',
  validate(schemas.productSchema),
  c.createProduct
);

router.put(
  '/products/:id',
  validate(schemas.productSchema),
  c.updateProduct
);

router.delete(
  '/products/:id',
  c.deleteProduct
);

// =====================================================
// PRODUCT IMPORT
// =====================================================
//
// Supported:
//   .xlsx
//   .xls
//   .csv
//   .pdf
//
// Frontend request:
//   POST /products/import
//
// Content-Type:
//   multipart/form-data
//
// File field name:
//   file
//
// =====================================================

router.post(
  '/products/import',
  productImportUpload.single('file'),
  c.importProducts
);

// =====================================================
// TRANSACTIONS
// =====================================================

router.get(
  '/transactions',
  c.listTransactions
);

router.get(
  '/transactions/recent',
  c.recentTransactions
);

router.post(
  '/transactions/stock-in',
  validate(schemas.stockInSchema),
  c.stockIn
);

router.post(
  '/transactions/stock-out',
  validate(schemas.stockOutSchema),
  c.stockOut
);

// =====================================================
// REPORTS
// =====================================================

router.get(
  '/reports/summary',
  c.summary
);

router.get(
  '/reports/monthly',
  c.monthlyMovement
);

router.get(
  '/reports/project-usage',
  c.projectUsage
);

router.get(
  '/reports/top-products',
  c.topProducts
);

// =====================================================
// SETTINGS
// =====================================================

router.get(
  '/settings',
  async (req, res, next) => {
    try {
      const items = await prisma.setting.findMany();

      res.json(items);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/settings/:key',
  async (req, res, next) => {
    try {
      const key = req.params.key;

      const value = String(
        req.body.value ?? ''
      );

      const item = await prisma.setting.upsert({
        where: {
          key,
        },

        update: {
          value,
        },

        create: {
          key,
          value,
        },
      });

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// BACKUP & RESTORE
// =====================================================

// IMPORTANT:
// Your project is running locally on Windows.
// So don't hard-code /app/backend-node/data/crm.db.
//
// process.cwd() will point to:
// C:\Users\rahul\Music\app\backend-node
//
// Therefore DB path becomes:
// C:\Users\rahul\Music\app\backend-node\data\crm.db

const DB_PATH = path.resolve(
  process.env.DB_PATH ||
    path.join(process.cwd(), 'data', 'crm.db')
);

const BACKUP_DIR = path.resolve(
  process.env.BACKUP_DIR ||
    path.join(process.cwd(), 'backups')
);

// Create backup directory if it doesn't exist.
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, {
    recursive: true,
  });
}

// =====================================================
// DOWNLOAD DATABASE BACKUP
// =====================================================

router.get(
  '/backup/download',
  (req, res) => {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({
        error: 'Database file not found',
      });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    res.download(
      DB_PATH,
      `crm-backup-${timestamp}.db`
    );
  }
);

// =====================================================
// CREATE DATABASE BACKUP
// =====================================================

router.post(
  '/backup/create',
  async (req, res, next) => {
    try {
      if (!fs.existsSync(DB_PATH)) {
        return res.status(404).json({
          error: 'Database file not found',
        });
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

      const destination = path.join(
        BACKUP_DIR,
        `crm-${timestamp}.db`
      );

      // Disconnect Prisma before copying SQLite database.
      await prisma.$disconnect();

      fs.copyFileSync(
        DB_PATH,
        destination
      );

      const stat = fs.statSync(
        destination
      );

      res.json({
        success: true,
        filename: path.basename(destination),
        path: destination,
        size: stat.size,
        createdAt: stat.mtime,
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// LIST DATABASE BACKUPS
// =====================================================

router.get(
  '/backup/list',
  (req, res, next) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        return res.json([]);
      }

      const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((file) =>
          file.toLowerCase().endsWith('.db')
        )
        .map((file) => {
          const filePath = path.join(
            BACKUP_DIR,
            file
          );

          const stat = fs.statSync(
            filePath
          );

          return {
            filename: file,
            size: stat.size,
            createdAt: stat.mtime,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        );

      res.json(files);
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// RESTORE DATABASE BACKUP
// =====================================================

const backupUpload = multer({
  dest: path.join(
    process.cwd(),
    'temp'
  ),
});

const TEMP_BACKUP_DIR = path.join(
  process.cwd(),
  'temp'
);

if (!fs.existsSync(TEMP_BACKUP_DIR)) {
  fs.mkdirSync(TEMP_BACKUP_DIR, {
    recursive: true,
  });
}

router.post(
  '/backup/restore',
  backupUpload.single('file'),

  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No backup file uploaded',
        });
      }

      // Disconnect Prisma before replacing SQLite database.
      await prisma.$disconnect();

      fs.copyFileSync(
        req.file.path,
        DB_PATH
      );

      // Remove temporary uploaded file.
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json({
        success: true,
        message:
          'Database restored successfully. Please refresh the application.',
      });
    } catch (error) {
      // Try to clean up temporary file if something fails.
      if (
        req.file &&
        req.file.path &&
        fs.existsSync(req.file.path)
      ) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {
          // Ignore cleanup error.
        }
      }

      next(error);
    }
  }
);

// =====================================================
// DELETE BACKUP
// =====================================================

router.delete(
  '/backup/:filename',
  (req, res, next) => {
    try {
      const filename =
        req.params.filename.replace(
          /[^a-zA-Z0-9_\-.]/g,
          ''
        );

      const filePath = path.join(
        BACKUP_DIR,
        filename
      );

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          error: 'Backup not found',
        });
      }

      fs.unlinkSync(filePath);

      res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;