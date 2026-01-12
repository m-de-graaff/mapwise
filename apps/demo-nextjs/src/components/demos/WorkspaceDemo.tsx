"use client";

import { MapShell, MapTopBar, MapViewport, useWorkspaceStorage } from "@mapwise/ui";
import { useMap } from "@mapwise/core/react";
import "@mapwise/ui/styles.css";
import { useState, useEffect } from "react";

export function WorkspaceDemo() {
	const {
		workspaces: localWorkspaces,
		saveWorkspace: saveLocal,
		deleteWorkspace: deleteLocal,
	} = useWorkspaceStorage();
	// biome-ignore lint/suspicious/noExplicitAny: Temporary cast for verification
	const [serverWorkspaces, setServerWorkspaces] = useState<any[]>([]);
	const [saveName, setSaveName] = useState("");
	const { controller } = useMap();

	const refreshServer = async () => {
		try {
			const res = await fetch("/api/workspaces");
			if (res.ok) {
				setServerWorkspaces(await res.json());
			}
		} catch (e) {
			console.error(e);
		}
	};

	useEffect(() => {
		refreshServer();
	}, []);

	const handleSaveServer = async () => {
		if (!saveName) {
			return;
		}

		const state = {
			center: controller?.map?.getCenter() || { lng: 0, lat: 0 },
			zoom: controller?.map?.getZoom() || 0,
			date: new Date().toISOString(),
		};

		await fetch("/api/workspaces", {
			method: "POST",
			body: JSON.stringify({ name: saveName, data: state }),
		});
		refreshServer();
	};

	const handleSaveLocal = () => {
		if (!saveName) {
			return;
		}
		const state = {
			center: controller?.map?.getCenter() || { lng: 0, lat: 0 },
			zoom: controller?.map?.getZoom() || 0,
		};
		saveLocal(saveName, state);
	};

	return (
		<MapShell
			className="absolute inset-0 h-full w-full"
			topBar={<MapTopBar title="Persistence Demo" />}
		>
			<MapViewport />
			<div className="absolute top-4 left-4 z-10 bg-card p-4 rounded shadow-lg w-80 max-h-[80vh] overflow-auto pointer-events-auto">
				<h2 className="font-bold mb-4">Workspace Manager</h2>

				<div className="mb-4 space-y-2">
					<label htmlFor="workspace-name" className="text-sm font-medium">
						Save Current State
					</label>
					<div className="flex gap-2">
						<input
							className="flex-1 border rounded px-2 py-1 text-sm bg-background"
							id="workspace-name"
							placeholder="Workspace Name"
							value={saveName}
							onChange={(e) => setSaveName(e.target.value)}
						/>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleSaveLocal}
							className="flex-1 bg-primary text-primary-foreground py-1 px-2 rounded text-sm hover:opacity-90"
						>
							Save Local
						</button>
						<button
							type="button"
							onClick={handleSaveServer}
							className="flex-1 bg-secondary text-secondary-foreground py-1 px-2 rounded text-sm hover:opacity-90"
						>
							Save Server
						</button>
					</div>
				</div>

				<div className="mb-4">
					<h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
						Local Workspaces
					</h3>
					{localWorkspaces.length === 0 ? (
						<div className="text-xs text-muted-foreground italic">None</div>
					) : (
						<ul className="space-y-1">
							{localWorkspaces.map((w) => (
								<li
									key={w.name}
									className="flex justify-between items-center text-sm p-1 hover:bg-muted rounded group"
								>
									<span>{w.name}</span>
									<div className="opacity-0 group-hover:opacity-100 flex gap-1">
										<button
											type="button"
											onClick={() => {
												// biome-ignore lint/suspicious/noConsoleLog: Demo feedback
												console.log("Load clicked");
											}}
											className="text-xs text-blue-500"
										>
											Load
										</button>
										<button
											type="button"
											onClick={() => deleteLocal(w.name)}
											className="text-xs text-red-500"
										>
											Del
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				<div>
					<h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
						Server Workspaces
					</h3>
					{serverWorkspaces.length === 0 ? (
						<div className="text-xs text-muted-foreground italic">None</div>
					) : (
						<ul className="space-y-1">
							{serverWorkspaces.map((w) => (
								<li
									key={w.name}
									className="flex justify-between items-center text-sm p-1 hover:bg-muted rounded group"
								>
									<span>{w.name}</span>
									<div className="opacity-0 group-hover:opacity-100 flex gap-1">
										<button
											type="button"
											onClick={() => {
												// biome-ignore lint/suspicious/noConsoleLog: Demo feedback
												console.log("Load clicked");
											}}
											className="text-xs text-blue-500"
										>
											Load
										</button>
										<button
											type="button"
											onClick={async () => {
												await fetch(`/api/workspaces?name=${w.name}`, { method: "DELETE" });
												refreshServer();
											}}
											className="text-xs text-red-500"
										>
											Del
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</MapShell>
	);
}
