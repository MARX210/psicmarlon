/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // O basePath deve ser apenas o nome do repositório, não a URL completa
  basePath: process.env.NODE_ENV === 'production' ? '/psicmarlon' : '',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
