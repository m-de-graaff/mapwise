import Link from "next/link";

export default function HomePage() {
	return (
		<main className="flex flex-1 flex-col justify-center text-center">
			<div className="container relative z-10 flex flex-col items-center gap-6 py-24 md:py-32 lg:py-40">
				<div className="relative">
					<div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-teal-400 opacity-20 blur-xl" />
					<h1 className="relative text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
						<span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
							Mapwise
						</span>
					</h1>
				</div>

				<p className="max-w-[42rem] text-lg text-muted-foreground sm:text-xl leading-relaxed">
					A modern, type-safe React component library for building interactive maps with MapLibre GL
					JS.
				</p>

				<div className="flex flex-wrap items-center justify-center gap-4 mt-4">
					<Link
						href="/docs/get-started"
						className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:scale-105 active:scale-95"
					>
						Get Started
					</Link>
					<Link
						href="/docs"
						className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95"
					>
						Documentation
					</Link>
				</div>

				<div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-4xl text-left">
					<FeatureCard
						title="Type-Safe"
						description="Built with TypeScript for a robust developer experience and fewer runtime errors."
					/>
					<FeatureCard
						title="Modular"
						description="Install only what you need. Core controller, UI components, and plugins are separate packages."
					/>
					<FeatureCard
						title="Customizable"
						description="Headless core with unstyled or beautifully styled UI components via Tailwind CSS."
					/>
				</div>
			</div>
		</main>
	);
}

function FeatureCard({ title, description }: { title: string; description: string }) {
	return (
		<div className="group rounded-lg border bg-card p-6 shadow-sm transition-colors hover:border-primary/50">
			<h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{title}</h3>
			<p className="text-sm text-muted-foreground">{description}</p>
		</div>
	);
}
