import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@mapwise/core", "@mapwise/ui", "@mapwise/plugins", "@mapwise/layers"],
};

export default nextConfig;
