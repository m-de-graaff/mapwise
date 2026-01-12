import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@mapwise/core": path.resolve(__dirname, "../../packages/core/src"),
			"@mapwise/ui": path.resolve(__dirname, "../../packages/ui/src"),
			"@mapwise/layers": path.resolve(__dirname, "../../packages/layers/src"),
			"@mapwise/plugins": path.resolve(__dirname, "../../packages/plugins/src"),
		},
	},
});
