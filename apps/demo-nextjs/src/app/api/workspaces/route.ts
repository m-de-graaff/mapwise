import { NextResponse } from "next/server";

// Simple in-memory store for demo purposes (will reset on server restart)
// In a real app, use a database.
const WORKSPACE_STORE: Record<string, unknown> = {};

export async function GET() {
	return NextResponse.json(
		Object.entries(WORKSPACE_STORE).map(([name, data]) => ({
			name,
			data,
			lastModified: Date.now(),
		})),
	);
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { name, data } = body;
		if (!(name && data)) {
			return NextResponse.json({ error: "Missing name or data" }, { status: 400 });
		}

		WORKSPACE_STORE[name] = data;
		return NextResponse.json({ success: true, name });
	} catch (_error) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}
}

export async function DELETE(request: Request) {
	const { searchParams } = new URL(request.url);
	const name = searchParams.get("name");

	if (name && WORKSPACE_STORE[name]) {
		delete WORKSPACE_STORE[name];
		return NextResponse.json({ success: true });
	}
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}
