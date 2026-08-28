export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;

  // Only log internal server errors (500) or DB failures to console
  if (statusCode >= 500 || err.name?.includes('Sequelize')) {
    console.error('[Error Middleware]', err);
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'An account with this email address already exists.'
    });
  }

  // Sequelize database validation error
  if (err.name === 'SequelizeValidationError') {
    const firstMsg = err.errors && err.errors.length > 0 ? err.errors[0].message : 'Validation error';
    return res.status(400).json({
      success: false,
      message: firstMsg
    });
  }

  // Custom status error
  const clientMessage = statusCode === 500
    ? 'An unexpected error occurred on the server. Please try again later.'
    : (err.message || 'Something went wrong');

  return res.status(statusCode).json({
    success: false,
    message: clientMessage
  });
};
