import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	transpilePackages: ["@mapwise/core", "@mapwise/ui", "@mapwise/layers", "@mapwise/plugins"],
	async rewrites() {
		return [
			{
				source: "/docs/:path*.mdx",
				destination: "/llms-mdx/docs/:path*",
			},
		];
	},
};

export default withMDX(config);
