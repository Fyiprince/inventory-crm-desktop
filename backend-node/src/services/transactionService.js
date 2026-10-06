const prisma = require('../prisma');
const { HttpError } = require('../middleware/error');
const {
  parsePagination,
  buildResponse,
} = require('../utils/pagination');

async function list(query) {
  const { page, pageSize, skip, sortBy, sortDir } =
    parsePagination(query);

  const AND = [];

  if (query.type) {
    AND.push({
      type: query.type,
    });
  }

  if (query.productId) {
    AND.push({
      productId: query.productId,
    });
  }

  if (query.projectId) {
    AND.push({
      projectId: query.projectId,
    });
  }

  // Category filter
  if (query.categoryId) {
    AND.push({
      product: {
        categoryId: query.categoryId,
      },
    });
  }

  // Search product, SKU, note, or Stock Out By
  if (query.search) {
    AND.push({
      OR: [
        {
          product: {
            name: {
              contains: query.search,
            },
          },
        },
        {
          product: {
            sku: {
              contains: query.search,
            },
          },
        },
        {
          note: {
            contains: query.search,
          },
        },
        {
          stockOutBy: {
            contains: query.search,
          },
        },
      ],
    });
  }

  if (query.from || query.to) {
    const date = {};

    if (query.from) {
      date.gte = new Date(query.from);
    }

    if (query.to) {
      date.lte = new Date(query.to);
    }

    AND.push({
      date,
    });
  }

  const where = AND.length
    ? {
        AND,
      }
    : {};

  const orderKey = [
    'date',
    'createdAt',
    'quantity',
    'type',
  ].includes(sortBy)
    ? sortBy
    : 'date';

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [orderKey]: sortDir,
      },
      include: {
        product: true,
        project: true,
        supplier: true,
      },
    }),

    prisma.transaction.count({
      where,
    }),
  ]);

  return buildResponse(
    items,
    total,
    page,
    pageSize
  );
}

async function stockIn({
  productId,
  quantity,
  supplierId,
  location,
  rackNumber,
  unitCost,
  gstPercentage = 0,
  gstType = 'CGST',
  cgstPercentage = null,
  transportationCharges = 0,
  reference,
  note,
  date,
}) {
  if (quantity <= 0) {
    throw new HttpError(
      400,
      'Quantity must be > 0'
    );
  }

  // -----------------------------
  // GST validation
  // -----------------------------

  const gstRate = Number(
    gstPercentage || 0
  );

  if (
    !Number.isFinite(gstRate) ||
    gstRate < 0 ||
    gstRate > 100
  ) {
    throw new HttpError(
      400,
      'GST percentage must be between 0 and 100'
    );
  }

  const validGstTypes = [
    'CGST',
    'SGST',
    'IGST',
    'UTGST',
  ];

  if (!validGstTypes.includes(gstType)) {
    throw new HttpError(
      400,
      'Invalid GST type'
    );
  }

  // -----------------------------
  // CGST validation
  // -----------------------------

  let cgstRate = 0;

  if (gstType === 'CGST') {
    cgstRate = Number(
      cgstPercentage || 0
    );

    if (
      !Number.isFinite(cgstRate) ||
      cgstRate < 0 ||
      cgstRate > 100
    ) {
      throw new HttpError(
        400,
        'CGST percentage must be between 0 and 100'
      );
    }
  }

  // -----------------------------
  // Purchase price validation
  // -----------------------------

  const purchasePrice =
    unitCost !== undefined &&
    unitCost !== null &&
    unitCost !== ''
      ? Number(unitCost)
      : null;

  if (
    purchasePrice !== null &&
    (!Number.isFinite(purchasePrice) ||
      purchasePrice < 0)
  ) {
    throw new HttpError(
      400,
      'Purchase price must be a valid non-negative number'
    );
  }

  // -----------------------------
  // Transportation validation
  // -----------------------------

  const transportation =
    transportationCharges !== undefined &&
    transportationCharges !== null &&
    transportationCharges !== ''
      ? Number(transportationCharges)
      : 0;

  if (
    !Number.isFinite(transportation) ||
    transportation < 0
  ) {
    throw new HttpError(
      400,
      'Transportation charges must be a valid non-negative number'
    );
  }

  // -----------------------------
  // Amount calculations
  // -----------------------------

  // Purchase amount before transportation and GST
  const baseAmount =
    purchasePrice !== null
      ? purchasePrice * Number(quantity)
      : 0;

  // GST is calculated after adding transportation
  const taxableAmount =
    baseAmount + transportation;

  // -----------------------------
  // GST calculation
  // -----------------------------

  let sgstAmount = 0;
  let cgstAmount = null;
  let gstAmount = 0;

  if (gstType === 'CGST') {
    /*
     * In CGST mode:
     *
     * gstPercentage = SGST percentage
     * cgstPercentage = CGST percentage
     *
     * Example:
     * SGST = 9%
     * CGST = 9%
     * Total GST = 18%
     */

    sgstAmount =
      (taxableAmount * gstRate) / 100;

    cgstAmount =
      (taxableAmount * cgstRate) / 100;

    gstAmount =
      sgstAmount + cgstAmount;
  } else {
    /*
     * For SGST / IGST / UTGST:
     *
     * gstPercentage is treated as
     * the single GST percentage.
     */

    gstAmount =
      (taxableAmount * gstRate) / 100;

    cgstAmount = null;
  }

  // Final amount including transportation + GST
  const totalAmount =
    taxableAmount + gstAmount;

  return prisma.$transaction(async (tx) => {
    // -----------------------------
    // Product validation
    // -----------------------------

    const product =
      await tx.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      throw new HttpError(
        404,
        'Product not found'
      );
    }

    // -----------------------------
    // Supplier validation
    // -----------------------------

    if (supplierId) {
      const supplier =
        await tx.supplier.findUnique({
          where: {
            id: supplierId,
          },
        });

      if (!supplier) {
        throw new HttpError(
          404,
          'Supplier not found'
        );
      }
    }

    // -----------------------------
    // Update product stock
    // -----------------------------

    const updated =
      await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          currentStock: {
            increment: quantity,
          },
          ...(location !== undefined
            ? { location: location?.trim() || null }
            : {}),
          ...(rackNumber !== undefined
            ? { rackNumber: rackNumber?.trim() || null }
            : {}),
        },
      });

    // -----------------------------
    // Create transaction
    // -----------------------------

    const txn =
      await tx.transaction.create({
        data: {
          type: 'IN',
          productId,
          quantity,

          supplierId:
            supplierId || null,

          unitCost: purchasePrice,

          // -------------------------
          // GST details
          // -------------------------

          /*
           * In CGST mode:
           * gstPercentage stores SGST %
           *
           * In other modes:
           * gstPercentage stores the
           * single GST %
           */
          gstPercentage: gstRate,

          gstType,

          // CGST percentage
          cgstPercentage:
            gstType === 'CGST'
              ? cgstRate
              : null,

          // CGST amount
          cgstAmount,

          // Transportation
          transportationCharges:
            transportation,

          // Total GST
          gstAmount,

          // Final amount
          totalAmount,

          reference:
            reference || null,

          note:
            note || null,

          date: date
            ? new Date(date)
            : new Date(),
        },

        include: {
          product: true,
          project: true,
          supplier: true,
        },
      });

    return {
      transaction: txn,
      product: updated,
    };
  });
}

async function stockOut({
  productId,
  quantity,
  unitCost,
  projectId,
  stockOutBy,
  note,
  date,
}) {
  if (quantity <= 0) {
    throw new HttpError(
      400,
      'Quantity must be > 0'
    );
  }

  // Stock Out price is required
  if (
    unitCost === undefined ||
    unitCost === null ||
    unitCost === '' ||
    Number(unitCost) < 0 ||
    !Number.isFinite(Number(unitCost))
  ) {
    throw new HttpError(
      400,
      'Stock Out price is required'
    );
  }

  const stockOutPrice = Number(unitCost);

  return prisma.$transaction(async (tx) => {
    const product =
      await tx.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      throw new HttpError(
        404,
        'Product not found'
      );
    }

    if (
      product.currentStock < quantity
    ) {
      throw new HttpError(
        400,
        `Insufficient stock. Available: ${product.currentStock}`
      );
    }

    if (projectId) {
      const project =
        await tx.project.findUnique({
          where: {
            id: projectId,
          },
        });

      if (!project) {
        throw new HttpError(
          404,
          'Project not found'
        );
      }
    }

    const updated =
      await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          currentStock: {
            decrement: quantity,
          },
        },
      });

    const txn =
      await tx.transaction.create({
        data: {
          type: 'OUT',
          productId,
          quantity,

          // Save the actual Stock Out price
          unitCost: stockOutPrice,

          projectId:
            projectId || null,

          // Person who performed the stock out
          stockOutBy:
            stockOutBy?.trim() || null,

          note:
            note || null,

          date: date
            ? new Date(date)
            : new Date(),
        },

        include: {
          product: true,
          project: true,
          supplier: true,
        },
      });

    return {
      transaction: txn,
      product: updated,
    };
  });
}

async function recent(limit = 10) {
  return prisma.transaction.findMany({
    take: limit,

    orderBy: {
      date: 'desc',
    },

    include: {
      product: true,
      project: true,
      supplier: true,
    },
  });
}

module.exports = {
  list,
  stockIn,
  stockOut,
  recent,
};