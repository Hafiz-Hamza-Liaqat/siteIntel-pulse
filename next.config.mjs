import fs from 'node:fs';
import dotenv from 'dotenv';

// Explicitly load custom environment file when ENV_FILE is set (e.g. ENV_FILE=/etc/siteintel-pulse.env)
if (process.env.ENV_FILE && fs.existsSync(process.env.ENV_FILE)) {
  dotenv.config({ path: process.env.ENV_FILE });
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
};

export default nextConfig;
