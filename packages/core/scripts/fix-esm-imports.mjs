import fs from "node:fs";
import path from "node:path";

const TARGET_DIR = path.resolve(process.cwd(), "src");

function getAllFiles(dirPath, existingFiles) {
	const files = fs.readdirSync(dirPath);

	const arrayOfFiles = existingFiles || [];

	for (const file of files) {
		const fullPath = path.join(dirPath, file);
		if (fs.statSync(fullPath).isDirectory()) {
			getAllFiles(fullPath, arrayOfFiles);
		} else {
			arrayOfFiles.push(fullPath);
		}
	}

	return arrayOfFiles;
}

console.info(`Scanning ${TARGET_DIR} for missing extensions...`);

async function fixImports() {
	if (!fs.existsSync(TARGET_DIR)) {
		console.error(`Target directory not found: ${TARGET_DIR}`);
		process.exit(1);
	}

	const files = getAllFiles(TARGET_DIR, []).filter(
		(f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.endsWith(".d.ts"),
	);

	let changedFiles = 0;

	for (const file of files) {
		const content = fs.readFileSync(file, "utf-8");

		// Regex to match module specifiers in import/export statements
		const regex = /(from|import)\s+(['"])(\.{1,2}\/[^'"]+?)\2/g;

		const newContent = content.replace(regex, (match, keyword, quote, importPath) => {
			// Skip if already has extension
			if (
				importPath.endsWith(".js") ||
				importPath.endsWith(".json") ||
				importPath.endsWith(".css")
			) {
				return match;
			}

			// Resolve absolute path to check existence
			const dir = path.dirname(file);
			const absPath = path.resolve(dir, importPath);

			// Check for file existence
			// We prefer .ts over directory index
			if (
				fs.existsSync(`${absPath}.ts`) ||
				fs.existsSync(`${absPath}.tsx`) ||
				fs.existsSync(`${absPath}.d.ts`)
			) {
				return `${keyword} ${quote}${importPath}.js${quote}`;
			}

			if (
				fs.existsSync(path.join(absPath, "index.ts")) ||
				fs.existsSync(path.join(absPath, "index.tsx")) ||
				fs.existsSync(path.join(absPath, "index.d.ts"))
			) {
				return `${keyword} ${quote}${importPath}/index.js${quote}`;
			}

			// Fallback
			console.warn(`Warning: Could not resolve ${importPath} in ${file}`);
			return `${keyword} ${quote}${importPath}.js${quote}`;
		});

		if (newContent !== content) {
			fs.writeFileSync(file, newContent, "utf-8");
			console.info(`Fixed: ${path.relative(process.cwd(), file)}`);
			changedFiles++;
		}
	}

	console.info(`\nComplete! Modified ${changedFiles} files.`);
}

fixImports().catch((error) => {
	console.error(error);
	process.exit(1);
});
