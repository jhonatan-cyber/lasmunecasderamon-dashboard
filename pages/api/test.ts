import type { NextApiRequest, NextApiResponse } from "next";

export default function testHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(200).json({ 
    message: "Test endpoint funcionando",
    timestamp: new Date().toISOString()
  });
} 