import { useState, useRef } from "react";
import { FolderOpen, Save, Trash2, Download, Upload } from "lucide-react";
import { Button } from "../shadcn/button.js";
import { Input } from "../shadcn/input.js";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../shadcn/dropdown-menu.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../shadcn/dialog.js";
import { useWorkspaceStorage } from "../hooks/useWorkspaceStorage.js";
import { ScrollArea } from "../shadcn/scroll-area.js";

interface WorkspaceMenuProps {
	getSnapshot: () => Record<string, unknown>;
	onRestore: (data: Record<string, unknown>) => void;
}

export function WorkspaceMenu({ getSnapshot, onRestore }: WorkspaceMenuProps) {
	const {
		workspaces,
		saveWorkspace,
		deleteWorkspace,
		loadWorkspace,
		exportWorkspace,
		importWorkspace,
	} = useWorkspaceStorage();

	const [newWorkspaceName, setNewWorkspaceName] = useState("");
	const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSave = () => {
		if (!newWorkspaceName.trim()) {
			return;
		}
		const data = getSnapshot();
		saveWorkspace(newWorkspaceName, data);
		setIsSaveDialogOpen(false);
		setNewWorkspaceName("");
	};

	const handleLoad = (name: string) => {
		const data = loadWorkspace(name);
		if (data) {
			onRestore(data);
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			importWorkspace(file, () => {
				// Optionally auto-load on import
			});
		}
		// Reset input
		e.target.value = "";
	};

	return (
		<div className="flex items-center gap-1">
			<Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="gap-2">
							<FolderOpen className="h-4 w-4" />
							<span className="hidden sm:inline">Workspaces</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel>Manage Workspaces</DropdownMenuLabel>
						<DialogTrigger asChild>
							<DropdownMenuItem>
								<Save className="mr-2 h-4 w-4" />
								<span>Save Current...</span>
							</DropdownMenuItem>
						</DialogTrigger>
						<DropdownMenuItem onClick={handleImportClick}>
							<Upload className="mr-2 h-4 w-4" />
							<span>Import JSON...</span>
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
							Saved Workspaces
						</DropdownMenuLabel>

						<ScrollArea className="h-[200px]">
							{workspaces.length === 0 ? (
								<div className="p-2 text-xs text-muted-foreground italic text-center">
									No saved workspaces
								</div>
							) : (
								workspaces.map((ws) => (
									<div
										key={ws.name}
										className="flex items-center justify-between p-1 group hover:bg-muted rounded-sm"
									>
										<button
											type="button"
											className="flex-1 text-left text-sm truncate px-2 py-1"
											onClick={() => handleLoad(ws.name)}
										>
											{ws.name}
										</button>
										<div className="flex items-center opacity-0 group-hover:opacity-100">
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6"
												onClick={() => exportWorkspace(ws.name)}
												title="Export"
											>
												<Download className="h-3 w-3" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 text-destructive"
												onClick={() => deleteWorkspace(ws.name)}
												title="Delete"
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</div>
									</div>
								))
							)}
						</ScrollArea>
					</DropdownMenuContent>
				</DropdownMenu>

				<DialogContent>
					<DialogHeader>
						<DialogTitle>Save Workspace</DialogTitle>
						<DialogDescription>
							Save the current map state to your browser's local storage.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<Input
							placeholder="Workspace Name (e.g. Project Alpha)"
							value={newWorkspaceName}
							onChange={(e) => setNewWorkspaceName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSave()}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button onClick={handleSave}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				className="hidden"
				accept=".json"
			/>
		</div>
	);
}
