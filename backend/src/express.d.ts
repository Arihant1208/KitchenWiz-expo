import 'express';

import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface User {
      id: string;
    }

    interface Request {
      user?: User;

      /**
       * Request-scoped logger injected by pino-http.
       * Prefer this over console.* so logs include request id and route context.
       */
      log: Logger;
    }
  }
}

export {};
