"use client";

import { MapProvider } from "@mapwise/core/react";
import { FullGisDemo } from "@/components/demos/FullGisDemo";

export default function GisPage() {
	return (
		<MapProvider
			options={{
				style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
				center: [-73.935773, 40.71575],
				zoom: 9.898,
			}}
			className="w-full h-full"
		>
			<FullGisDemo />
		</MapProvider>
	);
}
