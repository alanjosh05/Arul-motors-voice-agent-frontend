/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `npm run build` writes plain HTML/JS/CSS to out/, which is
  // uploaded to GoDaddy hosting. All data comes from the API at runtime.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
  // A stray ~/package-lock.json made Next guess the home folder as the root.
  turbopack: { root: import.meta.dirname },
  agentRules: false,
};

export default nextConfig;
