/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 个人站无远程图床需求，关闭优化器以缩小 Image Optimizer 攻击面
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
