export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error.errors && Array.isArray(error.errors)) {
      const firstError = error.errors[0];
      return res.status(400).json({
        success: false,
        message: firstError.message,
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Invalid request data'
    });
  }
};
