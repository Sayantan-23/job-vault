// Adds the authenticated user set by authMiddleware. `req.id` is already
// provided by pino-http's types, so it is not redeclared here.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string }
    }
  }
}

export {}
