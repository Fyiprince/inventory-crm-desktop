function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const skip = (page - 1) * pageSize;
  const sortBy = query.sortBy || 'createdAt';
  const sortDir = (query.sortDir === 'asc' ? 'asc' : 'desc');
  return { page, pageSize, skip, sortBy, sortDir };
}

function buildResponse(items, total, page, pageSize) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

module.exports = { parsePagination, buildResponse };
