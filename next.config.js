/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose', '@xenova/transformers', 'sharp']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        mongodb: false,
        'mongodb-client-encryption': false,
        'onnxruntime-node': false,
      };
    }
    
    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    
    return config;
  }
};

module.exports = nextConfig;
