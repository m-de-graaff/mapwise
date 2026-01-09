import type { LucideIcon } from "lucide-react";
import { Button } from "../shadcn/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../shadcn/tooltip";
import { cn } from "../utils/cn";

export interface ToolButtonProps {
	icon: LucideIcon;
	label: string;
	active?: boolean;
	shortcut?: string;
	onClick: () => void;
	className?: string;
}

export function ToolButton({
	icon: Icon,
	label,
	active,
	shortcut,
	onClick,
	className,
}: ToolButtonProps) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={active ? "default" : "secondary"}
						size="icon"
						onClick={onClick}
						className={cn(
							"h-10 w-10 rounded-md transition-all duration-200 border border-transparent",
							active ? "shadow-md" : "hover:border-input bg-card",
							className,
						)}
						aria-label={label}
					>
						<Icon className="h-5 w-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="left" className="flex items-center gap-2">
					<span>{label}</span>
					{shortcut && (
						<span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
							{shortcut}
						</span>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
