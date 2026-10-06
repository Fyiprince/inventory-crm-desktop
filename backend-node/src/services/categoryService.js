const prisma = require('../prisma');
const { parsePagination, buildResponse } = require('../utils/pagination');

async function list(query) {
  const { page, pageSize, skip, sortBy, sortDir } = parsePagination(query);
  const search = query.search || '';
  const where = search
    ? { OR: [{ name: { contains: search } }, { description: { contains: search } }] }
    : {};

  const [items, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy === 'name' ? 'name' : 'createdAt']: sortDir },
      include: { _count: { select: { products: true } } },
    }),
    prisma.category.count({ where }),
  ]);
  return buildResponse(items, total, page, pageSize);
}

async function getAll() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

async function getById(id) {
  return prisma.category.findUnique({ where: { id } });
}

function normalizeData(data) {
  const normalized = { ...data };
  if (typeof normalized.skuPrefix === 'string') {
    normalized.skuPrefix = normalized.skuPrefix.trim().toUpperCase();
    if (normalized.skuPrefix && !normalized.skuPrefix.endsWith('-')) normalized.skuPrefix += '-';
  }
  return normalized;
}

async function create(data) {
  return prisma.category.create({ data: normalizeData(data) });
}

async function update(id, data) {
  return prisma.category.update({ where: { id }, data: normalizeData(data) });
}

async function remove(id) {
  return prisma.category.delete({ where: { id } });
}

module.exports = { list, getAll, getById, create, update, remove };
