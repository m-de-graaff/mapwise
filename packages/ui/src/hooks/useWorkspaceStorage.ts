import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export interface Workspace {
	name: string;
	lastModified: number;
	data: Record<string, unknown>;
}

const STORAGE_KEY = "mapwise_workspaces";

export function useWorkspaceStorage() {
	const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

	// Load list on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				setWorkspaces(JSON.parse(stored));
			}
		} catch (e) {
			console.error("Failed to load workspaces", e);
		}
	}, []);

	const saveWorkspace = useCallback((name: string, data: Record<string, unknown>) => {
		try {
			const newWorkspace: Workspace = {
				name,
				lastModified: Date.now(),
				data,
			};

			setWorkspaces((prev) => {
				const filtered = prev.filter((w) => w.name !== name);
				const next = [newWorkspace, ...filtered].sort((a, b) => b.lastModified - a.lastModified);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				return next;
			});
			toast.success(`Workspace "${name}" saved`);
		} catch (e) {
			console.error("Failed to save workspace", e);
			toast.error("Failed to save workspace");
		}
	}, []);

	const deleteWorkspace = useCallback((name: string) => {
		try {
			setWorkspaces((prev) => {
				const next = prev.filter((w) => w.name !== name);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				return next;
			});
			toast.success(`Workspace "${name}" deleted`);
		} catch (_e) {
			toast.error("Failed to delete workspace");
		}
	}, []);

	const loadWorkspace = useCallback(
		(name: string) => {
			const ws = workspaces.find((w) => w.name === name);
			if (ws) {
				return ws.data;
			}
			return null;
		},
		[workspaces],
	);

	const exportWorkspace = useCallback(
		(name: string) => {
			const ws = workspaces.find((w) => w.name === name);
			if (!ws) {
				return;
			}

			const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(ws.data, null, 2))}`;
			const downloadAnchorNode = document.createElement("a");
			downloadAnchorNode.setAttribute("href", dataStr);
			downloadAnchorNode.setAttribute("download", `${name}.mapwise.json`);
			document.body.appendChild(downloadAnchorNode);
			downloadAnchorNode.click();
			downloadAnchorNode.remove();
		},
		[workspaces],
	);

	const importWorkspace = useCallback(
		(file: File, onLoaded: (name: string, data: Record<string, unknown>) => void) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const json = JSON.parse(e.target?.result as string);
					// Basic validation could go here
					const name = file.name.replace(".json", "").replace(".mapwise", "");
					saveWorkspace(name, json);
					onLoaded(name, json);
					toast.success("Workspace imported");
				} catch (_err) {
					toast.error("Invalid workspace file");
				}
			};
			reader.readAsText(file);
		},
		[saveWorkspace],
	);

	return {
		workspaces,
		saveWorkspace,
		deleteWorkspace,
		loadWorkspace,
		exportWorkspace,
		importWorkspace,
	};
}
