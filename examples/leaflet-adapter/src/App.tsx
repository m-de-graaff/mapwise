import { useEffect, useRef } from "react";
import { Map as MapwiseMap, useMap } from "@mapwise/ui";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { LeafletMapAdapter } from "./adapter/LeafletMapAdapter";

// Fix Leaflet icon paths
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
	iconUrl: icon,
	shadowUrl: iconShadow,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LeafletLayer() {
	const { map, isLoaded } = useMap();
	const adapterRef = useRef<LeafletMapAdapter | null>(null);

	useEffect(() => {
		if (!(map && isLoaded) || adapterRef.current) {
			return;
		}

		// Initialize adapter
		// biome-ignore lint/suspicious/noExplicitAny: Context mismatch between MapLibre versions
		const adapter = new LeafletMapAdapter(map as any);
		adapterRef.current = adapter;

		// Create MarkerClusterGroup
		const markers = L.markerClusterGroup();

		// Add random markers
		const center = { lat: 52.3676, lng: 4.9041 };

		for (let i = 0; i < 100; i++) {
			const lat = center.lat + (Math.random() - 0.5) * 0.005;
			const lng = center.lng + (Math.random() - 0.5) * 0.005;
			const marker = L.marker([lat, lng]);
			marker.bindPopup(`Marker ${i}`);
			markers.addLayer(marker);
		}

		// Add to adapter (which adds to MapLibre container)
		// biome-ignore lint/suspicious/noExplicitAny: Adapter needs any for now
		markers.addTo(adapter as any);

		return () => {
			// Cleanup?
			// markers.remove(); // This supports removeLayer via adapter
		};
	}, [map, isLoaded]);

	return null;
}

export default function App() {
	return (
		<div style={{ width: "100vw", height: "100vh" }}>
			<MapwiseMap center={[4.9041, 52.3676]} zoom={13} style={{ width: "100%", height: "100%" }}>
				<LeafletLayer />
			</MapwiseMap>
		</div>
	);
}
