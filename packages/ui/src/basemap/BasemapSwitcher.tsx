import { cn } from "../utils/cn";
import { Button } from "../shadcn/button";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { Layers, Check, Loader2 } from "lucide-react";
import type { BasemapDef } from "../hooks/useBasemap";

interface BasemapSwitcherProps {
	basemaps: BasemapDef[];
	activeId: string;
	onChange: (id: string) => void;
	isLoading?: boolean;
}

export function BasemapSwitcher({
	basemaps,
	activeId,
	onChange,
	isLoading = false,
}: BasemapSwitcherProps) {
	const activeBasemap = basemaps.find((b) => b.id === activeId);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-8 border-dashed gap-2">
					{isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					) : (
						<Layers className="h-4 w-4 text-muted-foreground" />
					)}
					<span className="truncate max-w-[100px] sm:max-w-[140px]">
						{activeBasemap?.name || "Select Basemap"}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[200px] p-2">
				<div className="grid grid-cols-1 gap-1">
					{basemaps.map((b) => (
						<button
							type="button"
							key={b.id}
							onClick={() => onChange(b.id)}
							disabled={isLoading}
							className={cn(
								"flex items-center gap-2 p-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-left w-full",
								activeId === b.id && "bg-accent/50 font-medium",
							)}
						>
							{/* Thumbnail placeholder */}
							<div className="h-8 w-8 rounded overflow-hidden bg-muted border border-border flex-none">
								{b.thumbnail ? (
									<img src={b.thumbnail} alt={b.name} className="h-full w-full object-cover" />
								) : (
									<div className="flex items-center justify-center h-full w-full bg-secondary text-xs text-muted-foreground font-semibold">
										{b.name.substring(0, 2).toUpperCase()}
									</div>
								)}
							</div>

							<div className="flex-1 truncate">{b.name}</div>

							{activeId === b.id && <Check className="h-4 w-4 ml-auto text-primary" />}
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
