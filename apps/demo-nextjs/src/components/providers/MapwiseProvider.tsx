"use client";

import { Map as MapComponent } from "@mapwise/ui";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function MapwiseProvider({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<MapComponent center={[0, 0]} zoom={1} style={{ position: "absolute", inset: 0 }}>
				<div className="relative z-10 h-full w-full pointer-events-none">
					<div className="h-full w-full pointer-events-none">{children}</div>
				</div>
			</MapComponent>
		</ThemeProvider>
	);
}
