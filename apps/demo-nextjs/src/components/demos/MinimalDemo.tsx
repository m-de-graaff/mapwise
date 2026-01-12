"use client";

import { MapShell, MapViewport } from "@mapwise/ui";
import "@mapwise/ui/styles.css";
import Link from "next/link";

export function MinimalDemo() {
	return (
		<MapShell className="absolute inset-0 h-full w-full">
			<MapViewport />
			{/* Overlay for navigation */}
			<div className="absolute top-4 left-4 z-10 bg-card p-4 rounded shadow-lg max-w-sm pointer-events-auto">
				<h1 className="text-xl font-bold mb-2">Mapwise Minimal Demo</h1>
				<p className="text-sm text-muted-foreground mb-4">
					This is the simplest integration. Check other routes for more features.
				</p>
				<div className="grid grid-cols-2 gap-2">
					<Link href="/gis" className="text-sm text-primary hover:underline">
						/gis (Full App)
					</Link>
					<Link href="/layers" className="text-sm text-primary hover:underline">
						/layers (Add Layer)
					</Link>
					<Link href="/workspaces" className="text-sm text-primary hover:underline">
						/workspaces (Persistence)
					</Link>
					<Link href="/plugins" className="text-sm text-primary hover:underline">
						/plugins (Interactions)
					</Link>
				</div>
			</div>
		</MapShell>
	);
}
