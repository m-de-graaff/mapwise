import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	transpilePackages: ["@mapwise/core", "@mapwise/ui", "@mapwise/plugins"],
};

export default nextConfig;
