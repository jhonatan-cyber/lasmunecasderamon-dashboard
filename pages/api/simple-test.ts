import type { NextApiRequest, NextApiResponse } from "next";

export default function simpleTestHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ 
    success: true,
    message: "Test simple funcionando",
    timestamp: new Date().toISOString()
  });
} 