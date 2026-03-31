/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
      "/**": ["./prisma/dev.db"],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdfkit uses fs to load font metrics — keep it as a native require
      config.externals = config.externals || []
      config.externals.push("pdfkit")
    }
    return config
  },
}

module.exports = nextConfig
