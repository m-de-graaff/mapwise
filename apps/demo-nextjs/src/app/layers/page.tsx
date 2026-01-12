"use client";

import { MapProvider } from "@mapwise/core/react";
import { LayersDemo } from "@/components/demos/LayersDemo";

export default function LayersPage() {
	return (
		<MapProvider
			options={{
				style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
				center: [-73.935773, 40.71575],
				zoom: 9.898,
			}}
			className="w-full h-full"
		>
			<LayersDemo />
		</MapProvider>
	);
}
