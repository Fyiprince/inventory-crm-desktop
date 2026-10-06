const prisma = require('../prisma');

const {
  parsePagination,
  buildResponse,
} = require('../utils/pagination');

async function list(query) {
  const {
    page,
    pageSize,
    skip,
    sortBy,
    sortDir,
  } = parsePagination(query);

  const search = query.search || '';

  const where = search
    ? {
        OR: [
          {
            name: {
              contains: search,
            },
          },
          {
            phone: {
              contains: search,
            },
          },
          {
            email: {
              contains: search,
            },
          },
          {
            gstNumber: {
              contains: search,
            },
          },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy === 'name'
          ? 'name'
          : 'createdAt']: sortDir,
      },
    }),

    prisma.supplier.count({
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

async function getAll() {
  return prisma.supplier.findMany({
    orderBy: {
      name: 'asc',
    },
  });
}

async function getById(id) {
  return prisma.supplier.findUnique({
    where: {
      id,
    },
  });
}

async function create(data) {
  return prisma.supplier.create({
    data: {
      ...data,
      gstNumber:
        data.gstNumber?.trim() || null,
    },
  });
}

async function update(id, data) {
  return prisma.supplier.update({
    where: {
      id,
    },
    data: {
      ...data,
      gstNumber:
        data.gstNumber?.trim() || null,
    },
  });
}

async function remove(id) {
  return prisma.supplier.delete({
    where: {
      id,
    },
  });
}

module.exports = {
  list,
  getAll,
  getById,
  create,
  update,
  remove,
};