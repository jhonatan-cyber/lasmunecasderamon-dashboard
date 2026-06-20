import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { logger } from '@/lib/utils/logger';
import { formatErrorResponse } from '@/lib/errors/errors';


export function apiWrapper(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      const exception = error instanceof Error ? error : new Error(String(error));
      
      logger.error(`[API ERROR] ${req.method} ${req.url}`, {
        message: exception.message,
        stack: exception.stack,
        query: req.query,
      });

      const { success, error: errorDetails } = formatErrorResponse(error);
      
      
      let statusCode = 500;
      if ('statusCode' in (error as any)) {
        statusCode = (error as any).statusCode;
      }

      return res.status(statusCode).json({
        success,
        message: errorDetails.message,
        code: errorDetails.code,
        details: (errorDetails as any).details
      });
    }
  };
}
