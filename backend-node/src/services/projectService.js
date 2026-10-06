const prisma = require('../prisma');
const { parsePagination, buildResponse } = require('../utils/pagination');

async function list(query) {
  const { page, pageSize, skip, sortBy, sortDir } = parsePagination(query);
  const search = query.search || '';
  const where = search
    ? { OR: [{ name: { contains: search } }, { description: { contains: search } }] }
    : {};

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy === 'name' ? 'name' : 'createdAt']: sortDir },
      include: { _count: { select: { transactions: true } } },
    }),
    prisma.project.count({ where }),
  ]);
  return buildResponse(items, total, page, pageSize);
}

async function getAll() {
  return prisma.project.findMany({ orderBy: { name: 'asc' } });
}

async function getById(id) {
  return prisma.project.findUnique({ where: { id } });
}

async function create(data) {
  return prisma.project.create({ data });
}

async function update(id, data) {
  return prisma.project.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.project.delete({ where: { id } });
}

module.exports = { list, getAll, getById, create, update, remove };
