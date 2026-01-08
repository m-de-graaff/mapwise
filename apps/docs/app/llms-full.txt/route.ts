import { getLLMText, source } from "@/lib/source";

export const revalidate = false;

// biome-ignore lint/style/useNamingConvention: Next.js route handlers must be uppercase
export async function GET() {
	const scan = source.getPages().map(getLLMText);
	const scanned = await Promise.all(scan);

	return new Response(scanned.join("\n\n"));
}
