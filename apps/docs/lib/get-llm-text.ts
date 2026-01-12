import type { source } from "@/lib/source";
import type { InferPageType } from "fumadocs-core/source";

export async function getLLMText(page: InferPageType<typeof source>) {
	// biome-ignore lint/suspicious/noExplicitAny: Internal method missing from type
	const processed = await (page.data as any).getText("processed");

	return `# ${page.data.title} (${page.url})

${processed}`;
}
