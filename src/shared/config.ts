import path from 'path';

import fs from 'fs-extra';
import JSON5 from 'json5';
import isUndefined from 'lodash/isUndefined.js';
import {
  defaultCommand,
  defaultLogLevel,
  forceSSHDefault,
  jwtDefault,
  serverDefault,
  sshDefault,
} from './defaults.js';

import type { Config, JWT, Server, SSH, SSL } from './interfaces';

import type winston from 'winston';
import type { Arguments } from 'yargs';

type confValue =
  | boolean
  | string
  | number
  | undefined
  | unknown
  | SSH
  | Server
  | SSL
  | JWT
  | string[];

/**
 * Cast given value to boolean
 *
 * @param value - variable to cast
 * @returns variable cast to boolean
 */
function ensureBoolean(value: confValue): boolean {
  switch (value) {
    case true:
    case 'true':
    case 1:
    case '1':
    case 'on':
    case 'yes':
      return true;
    default:
      return false;
  }
}

function parseLogLevel(
  confLevel: typeof winston.level,
  optsLevel: unknown,
): typeof winston.level {
  const logLevel = isUndefined(optsLevel) ? confLevel : `${optsLevel}`;
  return [
    'error',
    'warn',
    'info',
    'http',
    'verbose',
    'debug',
    'silly',
  ].includes(logLevel)
    ? (logLevel as typeof winston.level)
    : defaultLogLevel;
}

/**
 * Parse algorithms string to an array
 *
 * @param algorithms - comma-separated algorithms string
 * @returns array of algorithms
 */
function parseAlgorithms(algorithms: unknown): string[] {
  if (isUndefined(algorithms)) return jwtDefault.algorithms;
  if (Array.isArray(algorithms)) return algorithms;
  return `${algorithms}`.split(',');
}

/**
 * Load JSON5 config from file and merge with default args
 * If no path is provided the default config is returned
 *
 * @param filepath - path to config to load
 * @returns variable cast to boolean
 */
export async function loadConfigFile(filepath?: string): Promise<Config> {
  if (isUndefined(filepath)) {
    return {
      ssh: sshDefault,
      server: serverDefault,
      command: defaultCommand,
      forceSSH: forceSSHDefault,
      logLevel: defaultLogLevel,
      jwt: jwtDefault,
    };
  }
  const content = await fs.readFile(path.resolve(filepath));
  const parsed = JSON5.parse(content.toString()) as Config;
  return {
    ssh: isUndefined(parsed.ssh)
      ? sshDefault
      : Object.assign(sshDefault, parsed.ssh),
    server: isUndefined(parsed.server)
      ? serverDefault
      : Object.assign(serverDefault, parsed.server),
    command: isUndefined(parsed.command) ? defaultCommand : `${parsed.command}`,
    forceSSH: isUndefined(parsed.forceSSH)
      ? forceSSHDefault
      : ensureBoolean(parsed.forceSSH),
    ssl: parsed.ssl,
    logLevel: parseLogLevel(defaultLogLevel, parsed.logLevel),
    jwt: isUndefined(parsed.jwt)
      ? jwtDefault
      : { ...jwtDefault, ...parsed.jwt },
  };
}

/**
 * Merge 2 objects removing undefined fields
 *
 * @param target - base object
 * @param source - object to get new values from
 * @returns merged object
 *
 */
const objectAssign = (
  target: SSH | Server | JWT,
  source: Record<string, confValue>,
): SSH | Server | JWT =>
  Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      isUndefined(source[key]) ? target[key] : value,
    ]),
  ) as SSH | Server | JWT;

/**
 * Merge cli arguemens with config object
 *
 * @param opts - Object containing cli args
 * @param config - Config object
 * @returns merged configuration
 *
 */
export function mergeCliConf(opts: Arguments, config: Config): Config {
  const ssl = {
    key: opts['ssl-key'],
    cert: opts['ssl-cert'],
    ...config.ssl,
  } as SSL;

  return {
    ssh: objectAssign(config.ssh, {
      user: opts['ssh-user'],
      host: opts['ssh-host'],
      auth: opts['ssh-auth'],
      port: opts['ssh-port'],
      pass: opts['ssh-pass'],
      key: opts['ssh-key'],
      allowRemoteHosts: opts['allow-remote-hosts'],
      allowRemoteCommand: opts['allow-remote-command'],
      config: opts['ssh-config'],
      knownHosts: opts['known-hosts'],
    }) as SSH,
    server: objectAssign(config.server, {
      base: opts.base,
      host: opts.host,
      port: opts.port,
      title: opts.title,
      allowIframe: opts['allow-iframe'],
    }) as Server,
    jwt: objectAssign(config.jwt || jwtDefault, {
      enable: opts['jwt-enable'],
      secret: opts['jwt-secret'],
      algorithms: parseAlgorithms(opts['jwt-algorithms']),
      expiresIn: opts['jwt-expires-in'],
    }) as JWT,
    command: isUndefined(opts.command) ? config.command : `${opts.command}`,
    forceSSH: isUndefined(opts['force-ssh'])
      ? config.forceSSH
      : ensureBoolean(opts['force-ssh']),
    ssl: isUndefined(ssl.key) || isUndefined(ssl.cert) ? undefined : ssl,
    logLevel: parseLogLevel(config.logLevel, opts['log-level']),
  };
}
