/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产环境优化配置
  compress: true, // 启用 gzip 压缩
  
  // 安全头配置
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },

  // 生产环境禁用源映射（可选，提高安全性）
  productionBrowserSourceMaps: false,

  // 优化图片加载
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // 实验性功能（根据需要启用）
  // experimental: {
  //   optimizeCss: true,
  // },
};

export default nextConfig;
