/**
 * Wraps async route handlers so unhandled promise rejections are passed to Express error middleware.
 * Use: router.get('/', asyncHandler(controller.getCart));
 */

/**
 * @param {(...args: any[]) => Promise<any>} fn Async request handler (req, res, next)
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
