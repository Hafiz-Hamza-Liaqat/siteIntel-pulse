import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

/**
 * Environment File Loading & Precedence Contract:
 *
 * 1. Default Behavior (ENV_FILE unset):
 *    No custom environment file is loaded. Next.js adheres to standard .env / .env.production resolution.
 *
 * 2. Custom Environment File (ENV_FILE set, e.g. ENV_FILE=/etc/siteintel-pulse.env):
 *    - The path is resolved relative to the current working directory.
 *    - The file MUST exist, MUST be a regular file, and MUST be readable by the running process.
 *    - If any check fails, configuration loading fails closed immediately with a descriptive fatal error.
 *    - Secret values are never printed in diagnostic messages or errors.
 *
 * 3. Precedence Hierarchy:
 *    - Host / Shell / Systemd exported environment variables take precedence over file values (override: false).
 *    - File values populate all unset environment variables deterministically.
 */
if (process.env.ENV_FILE !== undefined && process.env.ENV_FILE.trim() !== '') {
  const envFilePath = path.resolve(process.env.ENV_FILE.trim());

  if (!fs.existsSync(envFilePath)) {
    throw new Error(
      `[next.config.mjs] Fatal: Environment file specified by ENV_FILE does not exist: "${envFilePath}"`
    );
  }

  const stat = fs.statSync(envFilePath);
  if (!stat.isFile()) {
    throw new Error(
      `[next.config.mjs] Fatal: Path specified by ENV_FILE is not a regular file: "${envFilePath}"`
    );
  }

  try {
    fs.accessSync(envFilePath, fs.constants.R_OK);
  } catch (err) {
    throw new Error(
      `[next.config.mjs] Fatal: Environment file specified by ENV_FILE is not readable: "${envFilePath}"`
    );
  }

  const result = dotenv.config({ path: envFilePath, override: false });
  if (result.error) {
    throw new Error(
      `[next.config.mjs] Fatal: Failed to parse environment file "${envFilePath}": ${result.error.message}`
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['node:sqlite'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    // Content Security Policy is configured in Report-Only mode to avoid
    // breaking Next.js script chunk hydration, inline styles, or external image loading.
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    const securityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
      },
      {
        key: 'Content-Security-Policy-Report-Only',
        value: cspDirectives,
      },
    ];

    if (isProd) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
