/**
 * Preserve raw body for webhook signature verification.
 * Use as verify callback: express.json({ verify: rawBodyMiddleware }).
 */

import type { Request, Response } from 'express';

export function rawBodyMiddleware(req: Request, _res: Response, buf: Buffer, _encoding: string): void {
  (req as Request & { rawBody?: Buffer }).rawBody = buf;
}
