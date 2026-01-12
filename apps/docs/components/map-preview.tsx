"use client";

import { MapShell, Map as MapComponent } from "@mapwise/ui";

export default function MapPreview() {
	return (
		<div className="w-full h-full relative isolate">
			<MapShell>
				<MapComponent center={[-74.006, 40.7128]} zoom={11} className="w-full h-full" />
			</MapShell>
		</div>
	);
}
