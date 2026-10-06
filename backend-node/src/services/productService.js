const prisma = require('../prisma');

const { parsePagination, buildResponse } = require('../utils/pagination');

/**
 * Adds latest Stock In information to a product.
 *
 * Supplier and purchase price shown on Products page will come
 * from the most recent Stock In transaction for that product.
 */
function attachLatestStockIn(product) {
  const latestStockIn = product.transactions?.[0] || null;

  const { transactions, ...cleanProduct } = product;

  return {
    ...cleanProduct,
    latestStockInSupplier: latestStockIn?.supplier || null,
    latestStockInPrice:
      latestStockIn?.unitCost != null
        ? Number(latestStockIn.unitCost)
        : null,
    latestStockInDate: latestStockIn?.date || null,
  };
}

const latestStockInInclude = {
  where: { type: 'IN' },
  orderBy: [
    { date: 'desc' },
    { createdAt: 'desc' },
  ],
  take: 1,
  include: {
    supplier: true,
  },
};

async function list(query) {
  const { page, pageSize, skip, sortBy, sortDir } = parsePagination(query);

  const search = query.search || '';
  const categoryId = query.categoryId || undefined;
  const supplierId = query.supplierId || undefined;
  const lowStock = query.lowStock === 'true' || query.lowStock === '1';

  const AND = [];

  if (search) {
    AND.push({
      OR: [
        { name: { contains: search } },
        { sku: { contains: search } },
      ],
    });
  }

  if (categoryId) {
    AND.push({ categoryId });
  }

  if (supplierId) {
    AND.push({ supplierId });
  }

  if (lowStock) {
    AND.push({
      currentStock: {
        lte: prisma.raw
          ? prisma.raw('"minStock"')
          : undefined,
      },
    });
  }

  const where = AND.length ? { AND } : {};

  const orderMap = [
    'name',
    'sku',
    'currentStock',
    'price',
    'createdAt',
  ];

  const orderKey = orderMap.includes(sortBy)
    ? sortBy
    : 'createdAt';

  const [rawItems, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [orderKey]: sortDir },
      include: {
        category: true,
        supplier: true,
        transactions: latestStockInInclude,
      },
    }),

    prisma.product.count({ where }),
  ]);

  // Post-filter for lowStock because SQLite/Prisma
  // does not easily compare two columns directly.
  let items = rawItems;
  let totalFinal = total;

  if (lowStock) {
    items = rawItems.filter(
      (p) => p.currentStock <= p.minStock
    );

    totalFinal = items.length;
  }

  items = items.map(attachLatestStockIn);

  return buildResponse(
    items,
    totalFinal,
    page,
    pageSize
  );
}

async function getAll() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      category: true,
      supplier: true,
      transactions: latestStockInInclude,
    },
  });

  return products.map(attachLatestStockIn);
}

async function getById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      transactions: latestStockInInclude,
    },
  });

  if (!product) return null;

  return attachLatestStockIn(product);
}

async function create(data) {
  let createData = { ...data };

  if (createData.categoryId && createData.sku) {
    const category = await prisma.category.findUnique({
      where: { id: createData.categoryId },
      select: { skuPrefix: true },
    });

    const prefix = String(category?.skuPrefix || '').trim().toUpperCase();
    if (prefix) {
      const normalizedPrefix = prefix.endsWith('-') ? prefix : `${prefix}-`;
      const rawSku = String(createData.sku).trim();
      const suffix = rawSku.toUpperCase().startsWith(normalizedPrefix)
        ? rawSku.slice(normalizedPrefix.length)
        : rawSku.replace(/[^A-Za-z0-9_-]/g, '');

      createData.sku = `${normalizedPrefix}${suffix}`;
    }
  }

  const product = await prisma.product.create({
    data: createData,
    include: {
      category: true,
      supplier: true,
      transactions: latestStockInInclude,
    },
  });

  return attachLatestStockIn(product);
}

async function update(id, data) {
  const product = await prisma.product.update({
    where: { id },
    data,
    include: {
      category: true,
      supplier: true,
      transactions: latestStockInInclude,
    },
  });

  return attachLatestStockIn(product);
}

async function remove(id) {
  return prisma.product.delete({
    where: { id },
  });
}

async function lowStock() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      supplier: true,
      transactions: latestStockInInclude,
    },
    orderBy: {
      currentStock: 'asc',
    },
  });

  return products
    .filter((p) => p.currentStock <= p.minStock)
    .map(attachLatestStockIn);
}

module.exports = {
  list,
  getAll,
  getById,
  create,
  update,
  remove,
  lowStock,
};