const { HttpError } = require('./error');

const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'Validation Error', parsed.error.flatten()));
  }
  req.body = parsed.data;
  next();
};

module.exports = { validate };
