"use client";

import { useState } from "react";

interface FAQItem {
	question: string;
	answer: string;
}

const faqData: FAQItem[] = [
	{
		question: "What is Mapwise and who is it for?",
		answer:
			"Mapwise is a modern, type-safe React component library for building interactive maps. It's designed for developers who need robust, production-ready mapping capabilities using MapLibre GL JS.",
	},
	{
		question: "How does the layer system work?",
		answer:
			"Mapwise provides a declarative API for managing map layers. You can define WMS, GeoJSON, and other layer types as React components, and the library handles ordering, updates, and state management automatically.",
	},
	{
		question: "Can I use it with Next.js?",
		answer:
			"Yes! Mapwise is built with modern frameworks in mind. It supports Next.js and other React frameworks, with dedicated components for handling client-side rendering requirements of WebGL maps.",
	},
	{
		question: "Is it compatible with Mapbox styles?",
		answer:
			"Yes. Since Mapwise is built on MapLibre GL JS, it supports the standard Mapbox Style Specification. You can load styles from any compatible source.",
	},
	{
		question: "Is it open source?",
		answer:
			"Yes, Mapwise is open source and free to use. We believe in providing high-quality tools for the geospatial community.",
	},
	{
		question: "How do I get started?",
		answer:
			"Simply install the packages via npm or pnpm. Check out our 'Getting Started' guide to set up your first map in minutes.",
	},
];

function ChevronDownIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="m6 9 6 6 6-6"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default function FAQSection() {
	const [openItems, setOpenItems] = useState<number[]>([]);

	const toggleItem = (index: number) => {
		setOpenItems((prev) =>
			prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
		);
	};

	return (
		<div className="w-full flex justify-center items-start">
			<div className="flex-1 px-4 md:px-12 py-16 md:py-20 flex flex-col lg:flex-row justify-start items-start gap-6 lg:gap-12">
				{/* Left Column - Header */}
				<div className="w-full lg:flex-1 flex flex-col justify-center items-start gap-4 lg:py-5">
					<div className="w-full flex flex-col justify-center text-[#49423D] font-semibold leading-tight md:leading-[44px] font-sans text-4xl tracking-tight">
						Frequently Asked Questions
					</div>
					<div className="w-full text-[#605A57] text-base font-normal leading-7 font-sans">
						Explore your data, build your dashboard,
						<br className="hidden md:block" />
						bring your team together.
					</div>
				</div>

				{/* Right Column - FAQ Items */}
				<div className="w-full lg:flex-1 flex flex-col justify-center items-center">
					<div className="w-full flex flex-col">
						{faqData.map((item, index) => {
							const isOpen = openItems.includes(index);

							return (
								<div
									key={item.question}
									className="w-full border-b border-[rgba(73,66,61,0.16)] overflow-hidden"
								>
									<button
										type="button"
										onClick={() => toggleItem(index)}
										className="w-full px-5 py-[18px] flex justify-between items-center gap-5 text-left hover:bg-[rgba(73,66,61,0.02)] transition-colors duration-200"
										aria-expanded={isOpen}
									>
										<div className="flex-1 text-[#49423D] text-base font-medium leading-6 font-sans">
											{item.question}
										</div>
										<div className="flex justify-center items-center">
											<ChevronDownIcon
												className={`w-6 h-6 text-[rgba(73,66,61,0.60)] transition-transform duration-300 ease-in-out ${
													isOpen ? "rotate-180" : "rotate-0"
												}`}
											/>
										</div>
									</button>

									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
										}`}
									>
										<div className="px-5 pb-[18px] text-[#605A57] text-sm font-normal leading-6 font-sans">
											{item.answer}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
