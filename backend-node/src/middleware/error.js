function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  console.error('[API_ERROR]', err);
  const status = err.status || err.statusCode || 500;
  const msg = err.message || 'Internal Server Error';
  const payload = { error: msg };
  if (err.details) payload.details = err.details;
  res.status(status).json(payload);
}

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
  }
}

module.exports = { notFound, errorHandler, HttpError };
