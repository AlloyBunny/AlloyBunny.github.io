import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = "src/assets/images/avatar.jpeg";
const outputDir = "public/favicon";
const fallbackIcon = "public/favicon.ico";

const icons = [
	{ output: path.join(outputDir, "favicon-32.png"), size: 32 },
	{ output: path.join(outputDir, "favicon-128.png"), size: 128 },
	{ output: path.join(outputDir, "favicon-180.png"), size: 180 },
	{ output: path.join(outputDir, "favicon-192.png"), size: 192 },
];

async function writeIco(sourcePath, outputPath, size) {
	const png = await sharp(sourcePath)
		.resize(size, size, { fit: "cover", position: "center" })
		.png()
		.toBuffer();

	const header = Buffer.alloc(22);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(1, 4);
	header.writeUInt8(size === 256 ? 0 : size, 6);
	header.writeUInt8(size === 256 ? 0 : size, 7);
	header.writeUInt8(0, 8);
	header.writeUInt8(0, 9);
	header.writeUInt16LE(1, 10);
	header.writeUInt16LE(32, 12);
	header.writeUInt32LE(png.length, 14);
	header.writeUInt32LE(header.length, 18);

	await writeFile(outputPath, Buffer.concat([header, png]));
}

await mkdir(outputDir, { recursive: true });

await Promise.all([
	rm(path.join(outputDir, "avatar.jpeg"), { force: true }),
	rm(path.join(outputDir, "apple-touch-icon.png"), { force: true }),
	rm("favicon.ico", { force: true }),
]);

await Promise.all(
	icons.map(({ output, size }) =>
		sharp(source)
			.resize(size, size, { fit: "cover", position: "center" })
			.png()
			.toFile(output),
	),
);
await writeIco(source, fallbackIcon, 48);

console.log(`Generated ${icons.length + 1} favicon files from ${source}.`);
