"use client";

import { MapProvider } from "@mapwise/core/react";
import { PluginsDemo } from "@/components/demos/PluginsDemo";

export default function PluginsPage() {
	return (
		<MapProvider
			options={{
				style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
				center: [0, 0],
				zoom: 1,
			}}
			className="w-full h-full"
		>
			<PluginsDemo />
		</MapProvider>
	);
}
