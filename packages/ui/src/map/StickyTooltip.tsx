"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "./Map";
import { cn } from "../utils/cn";

export interface StickyTooltipProps {
	/** Tooltip content */
	children: React.ReactNode;
	/** Additional CSS classes */
	className?: string;
	/** Offset from the cursor [x, y] in pixels (default: [10, 10]) */
	offset?: [number, number];
	/** Whether the tooltip is visible */
	visible?: boolean;
}

/**
 * A tooltip that follows the mouse cursor.
 * Useful for inspecting map layers or drawing tools.
 */
export function StickyTooltip({
	children,
	className,
	offset = [15, 15],
	visible = true,
}: StickyTooltipProps) {
	const { map } = useMap();
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

	// Update position on mouse move
	useEffect(() => {
		if (!map) {
			return;
		}

		const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
			setPosition(e.point);
		};

		map.on("mousemove", handleMouseMove);

		// Initialize position if needed (though mousemove triggers fast)
		// We could use map.getContainer().getBoundingClientRect() logic if valid React event,
		// but sticking to map events is safer for map coordinates.

		return () => {
			map.off("mousemove", handleMouseMove);
		};
	}, [map]);

	// Create container for portal (appended to map container)
	const [container] = useState(() => {
		const div = document.createElement("div");
		div.className = "absolute top-0 left-0 z-50 pointer-events-none";
		return div;
	});

	useEffect(() => {
		if (!map?.getContainer()) {
			return;
		}

		map.getContainer().appendChild(container);
		return () => {
			if (map.getContainer().contains(container)) {
				map.getContainer().removeChild(container);
			}
		};
	}, [map, container]);

	if (!(visible && position && map)) {
		return null;
	}

	const style: React.CSSProperties = {
		transform: `translate(${position.x + offset[0]}px, ${position.y + offset[1]}px)`,
		// Ensure it doesn't flicker or lag too much
		willChange: "transform",
	};

	return createPortal(
		<div
			ref={tooltipRef}
			style={style}
			className={cn(
				"bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border",
				"whitespace-nowrap",
				className,
			)}
		>
			{children}
		</div>,
		container,
	);
}
