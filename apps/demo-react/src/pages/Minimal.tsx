import { MapShell, MapViewport } from "@mapwise/ui";
import { Link } from "react-router-dom";
import "@mapwise/ui/styles.css";

export function Minimal() {
	return (
		<MapShell className="h-full w-full">
			<MapViewport />

			<div className="absolute top-4 left-4 z-10 bg-card p-4 rounded shadow-lg max-w-sm">
				<h1 className="text-xl font-bold mb-2">Mapwise React Demo</h1>
				<p className="text-sm text-muted-foreground mb-4">Vite + React Integration.</p>
				<div className="flex gap-2">
					<Link to="/kitchen-sink" className="text-sm text-primary hover:underline">
						Kitchen Sink
					</Link>
				</div>
			</div>
		</MapShell>
	);
}
