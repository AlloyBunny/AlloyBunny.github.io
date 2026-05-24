import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = "src/assets/images/avatar.jpeg";
const outputDir = "public/favicon";

const icons = [
	["favicon-32.png", 32],
	["favicon-128.png", 128],
	["apple-touch-icon.png", 180],
	["favicon-192.png", 192],
];

await mkdir(outputDir, { recursive: true });
await copyFile(source, path.join(outputDir, "avatar.jpeg"));

await Promise.all(
	icons.map(([filename, size]) =>
		sharp(source)
			.resize(size, size, { fit: "cover", position: "center" })
			.png()
			.toFile(path.join(outputDir, filename)),
	),
);

console.log(`Generated ${icons.length} favicon PNG files from ${source}.`);
