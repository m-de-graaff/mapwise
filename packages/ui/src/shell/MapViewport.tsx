"use client";

import type * as React from "react";
import { cn } from "../utils/cn";
import { Loader2 } from "lucide-react";

interface MapViewportProps extends React.HTMLAttributes<HTMLDivElement> {
	isLoading?: boolean;
	children?: React.ReactNode;
}

export function MapViewport({
	children,
	isLoading = false,
	className,
	...props
}: MapViewportProps) {
	// This component ensures the map container takes full space and handles loading states
	return (
		<div className={cn("relative w-full h-full bg-muted/20", className)} {...props}>
			{children}

			{isLoading && (
				<div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm transition-all duration-200">
					<div className="flex flex-col items-center gap-2">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
						<span className="text-sm font-medium text-muted-foreground">Loading map...</span>
					</div>
				</div>
			)}
		</div>
	);
}
