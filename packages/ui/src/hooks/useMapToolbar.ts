import { useEffect } from "react";
import type { ToolId } from "../toolbar/MapToolbar";
import { useMap } from "@mapwise/core/react";

export function useMapToolbar(activeTool: ToolId) {
	const { controller } = useMap();

	useEffect(() => {
		if (!controller) {
			return;
		}

		// Handle Trash Tool (Action, not Mode)
		if ((activeTool as string) === "trash") {
			// Trigger clear all action via event
			// biome-ignore lint/suspicious/noExplicitAny: Event payload type mismatch
			controller.events.emit("plugin:@mapwise/draw:clearAll" as any, undefined);
			return;
		}

		// Mode Management
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Toolbar state management is complex
		const setMode = () => {
			// 1. Deactivate all tools
			if (controller.interaction) {
				for (const id of ["@mapwise/draw", "@mapwise/measure", "@mapwise/inspect"]) {
					controller.interaction.setActive(id, false);
				}
			}

			if (!activeTool) {
				return;
			}

			// 2. Activate and Configure specific tool
			if (activeTool === "draw") {
				controller.interaction.setActive("@mapwise/draw", true);
				// Default to drawing polygons
				// biome-ignore lint/suspicious/noExplicitAny: Event payload type mismatch
				controller.events.emit("plugin:@mapwise/draw:setMode" as any, { mode: "draw_polygon" });
			} else if (activeTool === "measure") {
				controller.interaction.setActive("@mapwise/measure", true);
				// Default to distance
				// biome-ignore lint/suspicious/noExplicitAny: Event payload type mismatch
				controller.events.emit("plugin:@mapwise/measure:setMode" as any, { mode: "distance" });
			} else if (activeTool === "inspect") {
				controller.interaction.setActive("@mapwise/inspect", true);
			}
		};

		setMode();
	}, [controller, activeTool]);
}
