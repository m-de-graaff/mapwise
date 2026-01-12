"use client";

import { MapProvider } from "@mapwise/core/react";
import { MinimalDemo } from "@/components/demos/MinimalDemo";

export default function Home() {
	return (
		<MapProvider
			className="w-full h-full"
			options={{
				style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
				center: [-73.935773, 40.71575],
				zoom: 9.898,
			}}
		>
			<MinimalDemo />
		</MapProvider>
	);
}
