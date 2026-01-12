"use client";

import { MapProvider } from "@mapwise/core/react";
import { WorkspaceDemo } from "@/components/demos/WorkspaceDemo";

export default function WorkspacesPage() {
	return (
		<MapProvider
			options={{
				style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
				center: [0, 0],
				zoom: 1,
			}}
			className="w-full h-full"
		>
			<WorkspaceDemo />
		</MapProvider>
	);
}
