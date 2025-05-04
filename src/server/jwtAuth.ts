import jwt from 'jsonwebtoken';
import type { JWT } from '../shared/interfaces.js';

import type { NextFunction, Request, Response } from 'express';

/**
 * JWT Authentication middleware
 * Verifies the JWT token from query params without extracting user data
 */
export function verifyJWT(
  req: Request,
  res: Response,
  next: NextFunction,
  jwtConfig: JWT,
) {
  try {
    // Skip verification if JWT is not enabled
    if (!jwtConfig.enable) {
      return next();
    }

    const token = req.query.token?.toString();

    if (!token) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'No authentication token provided',
      });
    }

    // Simply verify the token without storing user data
    jwt.verify(token, jwtConfig.secret, {
      algorithms: jwtConfig.algorithms as jwt.Algorithm[],
    });

    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again',
      });
    }

    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Authentication token is malformed or invalid',
      });
    }

    return res.status(500).json({
      error: 'Authentication error',
      message: 'An unexpected error occurred during authentication',
    });
  }
}
