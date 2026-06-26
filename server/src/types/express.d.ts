// Module augmentation: add `user` to Express's Request type so `req.user`
// (set by the authenticate middleware) typechecks everywhere downstream.
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}
