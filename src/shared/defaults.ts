import { isDev } from './env.js';
import type { JWT, SSH, Server } from './interfaces';

export const sshDefault: SSH = {
  user: process.env.SSHUSER || '',
  host: process.env.SSHHOST || 'localhost',
  auth: process.env.SSHAUTH || 'password',
  pass: process.env.SSHPASS || undefined,
  key: process.env.SSHKEY || undefined,
  port: parseInt(process.env.SSHPORT || '22', 10),
  knownHosts: process.env.KNOWNHOSTS || '/dev/null',
  allowRemoteHosts: false,
  allowRemoteCommand: false,
  config: process.env.SSHCONFIG || undefined,
};

export const serverDefault: Server = {
  base: process.env.BASE || '/wetty/',
  port: parseInt(process.env.PORT || '3000', 10),
  host: '0.0.0.0',
  title: process.env.TITLE || 'WeTTY - The Web Terminal Emulator',
  allowIframe: process.env.ALLOWIFRAME === 'true' || false,
};

export const forceSSHDefault = process.env.FORCESSH === 'true' || false;
export const defaultCommand = process.env.COMMAND || 'login';
export const defaultLogLevel = isDev ? 'debug' : 'http';

export const jwtDefault: JWT = {
  enable: process.env.JWT_ENABLE === 'true' || false,
  secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
  algorithms: (process.env.JWT_ALGORITHMS || 'HS256').split(','),
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
