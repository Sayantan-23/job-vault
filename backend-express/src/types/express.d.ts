// Adds the authenticated user set by authMiddleware, and the api-key principal
// set by apiKeyMiddleware (extension runtime). `req.id` is already provided by
// pino-http's types, so it is not redeclared here.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; sid?: string }
      apiKey?: { id: string; userId: string }
    }
  }
}

export {}
