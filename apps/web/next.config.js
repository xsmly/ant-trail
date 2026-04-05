/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
