import * as React from "react";
import { cn } from "../utils/cn";
import { Sheet, SheetContent } from "../shadcn/sheet";

interface MapShellProps {
	children: React.ReactNode;
	sidebar?: React.ReactNode;
	panel?: React.ReactNode;
	topBar?: React.ReactNode;
	statusBar?: React.ReactNode;
	className?: string;
	sidebarOpen?: boolean;
	onSidebarOpenChange?: (open: boolean) => void;
	isMobile?: boolean;
}

export function MapShell({
	children,
	sidebar,
	panel,
	topBar,
	statusBar,
	className,
	sidebarOpen = true,
	onSidebarOpenChange,
	isMobile = false,
}: MapShellProps) {
	// If undefined, we can manage state internally, but usually this is controlled.
	// For simplicity implementation here, we assume controlled or use a hook elsewhere.
	// However, specifically for the mobile drawer toggle, we might need a local handle if not provided.
	const [internalOpen, setInternalOpen] = React.useState(sidebarOpen);

	const isOpen = onSidebarOpenChange ? sidebarOpen : internalOpen;
	const setOpen = onSidebarOpenChange || setInternalOpen;

	return (
		<div
			className={cn(
				"flex flex-col h-screen w-screen overflow-hidden bg-transparent pointer-events-none",
				className,
			)}
		>
			{/* Top Bar Area */}
			{topBar && (
				<header className="flex-none z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pointer-events-auto">
					{/* Mobile Menu Toggle integrated into TopBar flow usually, but we can also expose it inside MapTopBar if needed. 
               For now, we render the passed topBar. If the user wants a toggle, they put it in the TopBar slot. */}
					{topBar}
				</header>
			)}

			<div className="flex-1 flex overflow-hidden relative">
				{/* Desktop Sidebar */}
				{!isMobile && sidebar && (
					<aside
						className={cn(
							"flex-none border-r border-border bg-card transition-all duration-300 ease-in-out z-40 pointer-events-auto",
							isOpen ? "w-80" : "w-0 overflow-hidden border-none",
						)}
					>
						<div className="h-full w-80 overflow-y-auto">{sidebar}</div>
					</aside>
				)}

				{/* Mobile Sidebar (Drawer) */}
				{isMobile && sidebar && (
					<Sheet open={isOpen} onOpenChange={setOpen}>
						<SheetContent side="left" className="w-[85vw] sm:w-[380px] p-0 pointer-events-auto">
							{sidebar}
						</SheetContent>
					</Sheet>
				)}

				{/* Main Map Area */}
				<main className="flex-1 relative min-w-0">
					{children}

					{/* Floating Right Panel (Optional) */}
					{panel && (
						<div className="absolute top-4 right-4 bottom-12 z-10 w-80 bg-card/90 backdrop-blur border border-border rounded-lg shadow-lg overflow-hidden flex flex-col pointer-events-auto">
							{panel}
						</div>
					)}
				</main>
			</div>

			{/* Status Bar */}
			{statusBar && (
				<footer className="flex-none border-t border-border bg-background z-50 pointer-events-auto">
					{statusBar}
				</footer>
			)}
		</div>
	);
}
