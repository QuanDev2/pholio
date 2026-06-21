import type { Request, Response, NextFunction, RequestHandler } from "express";

// Your route logic, but async (returns a promise).
type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// The factory: bake an async route into a normal (req,res,next) handler whose
// rejections auto-eject to the error handler via .catch(next).
export const asyncHandler =
  (fn: AsyncRouteHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
