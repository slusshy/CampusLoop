export function errorHandler(err, req, res, next) {
  console.error(`[API Error] ${req.method} ${req.url}:`, err.message || err);
  const status = err.statusCode || (err.message?.includes('Authentication') ? 401 : err.message?.includes('Access denied') ? 403 : 400);
  res.status(status).json({
    error: err.message || 'An unexpected server error occurred.',
  });
}
