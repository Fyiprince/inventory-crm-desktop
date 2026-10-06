const prisma = require('../prisma');
const dayjs = require('dayjs');

async function summary() {
  const [products, categories, suppliers, projects, txns, lowStockRaw] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.supplier.count(),
    prisma.project.count(),
    prisma.transaction.count(),
    prisma.product.findMany({ select: { currentStock: true, minStock: true, price: true } }),
  ]);
  const lowStock = lowStockRaw.filter((p) => p.currentStock <= p.minStock).length;
  const totalStockValue = lowStockRaw.reduce(
    (sum, p) => sum + p.currentStock * (p.price || 0),
    0
  );
  const totalUnits = lowStockRaw.reduce((sum, p) => sum + p.currentStock, 0);
  return {
    products,
    categories,
    suppliers,
    projects,
    transactions: txns,
    lowStock,
    totalStockValue,
    totalUnits,
  };
}

async function monthlyMovement(months = 6) {
  const start = dayjs().startOf('month').subtract(months - 1, 'month').toDate();
  const txns = await prisma.transaction.findMany({
    where: { date: { gte: start } },
    select: { type: true, quantity: true, date: true },
  });
  const bucket = {};
  for (let i = 0; i < months; i++) {
    const key = dayjs().startOf('month').subtract(months - 1 - i, 'month').format('YYYY-MM');
    bucket[key] = { month: key, in: 0, out: 0 };
  }
  txns.forEach((t) => {
    const key = dayjs(t.date).format('YYYY-MM');
    if (!bucket[key]) return;
    if (t.type === 'IN') bucket[key].in += t.quantity;
    else bucket[key].out += t.quantity;
  });
  return Object.values(bucket);
}

async function projectUsage() {
  const rows = await prisma.transaction.groupBy({
    by: ['projectId'],
    where: { type: 'OUT', projectId: { not: null } },
    _sum: { quantity: true },
    _count: { _all: true },
  });
  const projects = await prisma.project.findMany();
  const projMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    projectId: r.projectId,
    projectName: projMap[r.projectId] || 'Unknown',
    totalQuantity: r._sum.quantity || 0,
    transactionCount: r._count._all,
  }));
}

async function topProducts(limit = 10) {
  const rows = await prisma.transaction.groupBy({
    by: ['productId'],
    where: { type: 'OUT' },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });
  const productIds = rows.map((r) => r.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const map = Object.fromEntries(products.map((p) => [p.id, p]));
  return rows.map((r) => ({
    product: map[r.productId] || null,
    totalOut: r._sum.quantity || 0,
  }));
}

module.exports = { summary, monthlyMovement, projectUsage, topProducts };
