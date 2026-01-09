import { useState } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { cn } from "../utils/cn";

interface WmsLegendProps {
	url: string;
	alt?: string;
}

export function WmsLegend({ url, alt }: WmsLegendProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	if (!url) {
		return null;
	}

	if (hasError) {
		return (
			<div className="flex items-center gap-2 text-xs text-muted-foreground p-2 border border-dashed rounded bg-muted/50">
				<ImageOff className="h-3 w-3" />
				<span>Legend unavailable</span>
			</div>
		);
	}

	return (
		<div className="relative min-h-[20px] min-w-[50px]">
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/50">
					<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
				</div>
			)}
			<img
				src={url}
				alt={alt || "Layer legend"}
				className={cn("max-w-full h-auto rounded-sm", isLoading && "opacity-0")}
				onLoad={() => setIsLoading(false)}
				onError={() => {
					setIsLoading(false);
					setHasError(true);
				}}
				loading="lazy"
			/>
		</div>
	);
}
