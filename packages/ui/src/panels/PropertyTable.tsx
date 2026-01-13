import { ScrollArea } from "../shadcn/scroll-area.js";

interface PropertyTableProps {
	properties?: Record<string, unknown> | undefined;
}

export function PropertyTable({ properties }: PropertyTableProps) {
	if (!properties || Object.keys(properties).length === 0) {
		return (
			<div className="text-sm text-muted-foreground italic p-4 text-center">No properties</div>
		);
	}

	return (
		<ScrollArea className="h-full">
			<div className="p-4">
				<table className="w-full text-sm">
					<tbody>
						{Object.entries(properties).map(([key, value]) => (
							<tr key={key} className="border-b last:border-0 border-border/50">
								<td className="py-2 pr-4 font-medium text-muted-foreground align-top w-1/3 break-words">
									{key}
								</td>
								<td className="py-2 align-top break-words">
									{typeof value === "object" && value !== null ? (
										<pre className="text-xs bg-muted/50 p-1 rounded overflow-x-auto max-w-[200px]">
											{JSON.stringify(value, null, 2)}
										</pre>
									) : (
										String(value)
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</ScrollArea>
	);
}
