import type * as React from "react";
import { cn } from "../utils/cn.js";

interface MapTopBarProps {
	className?: string;
	left?: React.ReactNode;
	center?: React.ReactNode;
	right?: React.ReactNode;
	title?: React.ReactNode;
}

export function MapTopBar({ className, left, center, right, title }: MapTopBarProps) {
	return (
		<div className={cn("flex items-center justify-between h-14 px-4", className)}>
			<div className="flex items-center gap-4 flex-1">
				{left}
				{title && <div className="font-semibold text-lg tracking-tight truncate">{title}</div>}
			</div>

			{center && <div className="flex items-center justify-center flex-1">{center}</div>}

			<div className="flex items-center justify-end gap-2 flex-1">{right}</div>
		</div>
	);
}
