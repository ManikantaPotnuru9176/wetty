import compression from 'compression';
import winston from 'express-winston';
import { logger } from '../shared/logger.js';
import { verifyJWT } from './jwtAuth.js';
import { serveStatic, trim } from './socketServer/assets.js';
import { html } from './socketServer/html.js';
import { metricMiddleware, metricRoute } from './socketServer/metrics.js';
import { favicon, redirect } from './socketServer/middleware.js';
import { policies } from './socketServer/security.js';
import { listen } from './socketServer/socket.js';
import { loadSSL } from './socketServer/ssl.js';

import type { JWT, SSL, SSLBuffer, Server } from '../shared/interfaces.js';

import type { Express } from 'express';
import type SocketIO from 'socket.io';

export async function server(
  app: Express,
  { base, port, host, title, allowIframe }: Server,
  ssl?: SSL,
  jwt: JWT = {
    enable: false,
    secret: '',
    algorithms: [],
    expiresIn: '',
  },
): Promise<SocketIO.Server> {
  const basePath = trim(base);
  logger().info('Starting server', {
    ssl,
    port,
    base,
    title,
  });

  const client = html(basePath, title);

  const serverApp = app
    .disable('x-powered-by')
    .use(metricMiddleware(basePath))
    .use(`${basePath}/metrics`, metricRoute)
    .use(`${basePath}/client`, serveStatic('client'))
    .use(
      winston.logger({
        winstonInstance: logger(),
        expressFormat: true,
        level: 'http',
      }),
    )
    .use(compression())
    .use(await favicon(basePath))
    .use(redirect)
    .use(policies(allowIframe));

  // Conditionally apply JWT verification based on jwt.enable flag
  if (jwt.enable) {
    // Apply JWT verification when enabled
    serverApp
      .get(basePath, (req, res, next) => verifyJWT(req, res, next, jwt), client)
      .get(
        `${basePath}/ssh/:user`,
        (req, res, next) => verifyJWT(req, res, next, jwt),
        client,
      );
  } else {
    // Skip JWT verification when disabled
    serverApp.get(basePath, client).get(`${basePath}/ssh/:user`, client);
  }

  const sslBuffer: SSLBuffer = await loadSSL(ssl);

  return listen(app, host, port, basePath, sslBuffer);
}
