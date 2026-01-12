import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MapProvider } from "@mapwise/core";
import { Minimal } from "./pages/Minimal";
import { KitchenSink } from "./pages/KitchenSink";
import "@mapwise/ui/styles.css";

function App() {
	return (
		<BrowserRouter>
			<MapProvider
				options={{
					style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
					center: [-73.935773, 40.71575],
					zoom: 9.898,
				}}
			>
				<div className="h-screen w-screen bg-background text-foreground overflow-hidden">
					<Routes>
						<Route path="/" element={<Minimal />} />
						<Route path="/kitchen-sink" element={<KitchenSink />} />
					</Routes>
				</div>
			</MapProvider>
		</BrowserRouter>
	);
}

export default App;
