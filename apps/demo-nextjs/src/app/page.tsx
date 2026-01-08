"use client";

import { MapDemo } from "@/components/MapDemo";

export default function Home() {
	return (
		<div className="app">
			<header className="header">
				<div className="header-brand">
					<div className="header-logo">M</div>
					<h1 className="header-title">MapWise Demo</h1>
				</div>
				<span className="header-subtitle">Next.js App Router</span>
			</header>
			<main className="main">
				<MapDemo />
			</main>
		</div>
	);
}
