import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const configPath = new URL("../src/config.ts", import.meta.url);
const friendsPagePath = new URL("../src/pages/friends.astro", import.meta.url);
const papersPagePath = new URL("../src/pages/papers.astro", import.meta.url);
const papersContentPath = new URL(
	"../src/content/spec/papers.md",
	import.meta.url,
);
const makefilePath = new URL("../Makefile", import.meta.url);
const gitignorePath = new URL("../.gitignore", import.meta.url);
const faviconScriptPath = new URL(
	"../scripts/generate-favicons.mjs",
	import.meta.url,
);

test("Fuwari config keeps only the requested personalizations", async () => {
	const config = await readFile(configPath, "utf8");

	assert.match(config, /title:\s*"AlloyBunny's Blog"/);
	assert.match(config, /avatar:\s*"assets\/images\/avatar\.jpeg"/);

	const hueMatch = config.match(/hue:\s*(\d+)/);
	assert.ok(hueMatch, "themeColor.hue should be configured");
	const hue = Number(hueMatch[1]);
	assert.ok(hue >= 110 && hue <= 160, `expected green hue, got ${hue}`);

	assert.match(config, /LinkPreset\.Archive/);
	assert.doesNotMatch(config, /["']全部["']/);
});

test("navigation keeps archive, friends, papers, and about links", async () => {
	const config = await readFile(configPath, "utf8");

	assert.match(config, /LinkPreset\.Home/);
	assert.match(config, /LinkPreset\.Archive/);
	assert.match(config, /name:\s*"友链"[\s\S]*url:\s*"\/friends\/"/);
	assert.match(config, /name:\s*"Paper"[\s\S]*url:\s*"\/papers\/"/);
	assert.match(config, /LinkPreset\.About/);
});

test("profile keeps GitHub, Bilibili, and Xiaohongshu links", async () => {
	const config = await readFile(configPath, "utf8");

	assert.match(config, /name:\s*"GitHub"[\s\S]*icon:\s*"fa6-brands:github"/);
	assert.match(config, /url:\s*"https:\/\/github\.com\/AlloyBunny"/);
	assert.match(config, /name:\s*"Email"[\s\S]*icon:\s*"fa6-regular:envelope"/);
	assert.match(config, /url:\s*"mailto:yxzhai1024@gmail\.com"/);
	assert.match(
		config,
		/name:\s*"Bilibili"[\s\S]*icon:\s*"fa6-brands:bilibili"/,
	);
	assert.match(config, /url:\s*"https:\/\/space\.bilibili\.com\/305821778"/);
	assert.match(config, /name:\s*"小红书"[\s\S]*icon:\s*"material-symbols:book-2-outline"/);
	assert.match(
		config,
		/url:\s*"https:\/\/www\.xiaohongshu\.com\/user\/profile\/640bede4000000000b017591"/,
	);
});

test("avatar is used as the favicon", async () => {
	const config = await readFile(configPath, "utf8");

	assert.match(config, /src:\s*"\/favicon\/favicon-32\.png"/);
	assert.match(config, /src:\s*"\/favicon\/favicon-128\.png"/);
	assert.match(config, /src:\s*"\/favicon\/apple-touch-icon\.png"/);
	assert.match(config, /src:\s*"\/favicon\/favicon-192\.png"/);
});

test("friends and papers pages are available", async () => {
	const [friendsPage, papersPage, papersContent] = await Promise.all([
		readFile(friendsPagePath, "utf8"),
		readFile(papersPagePath, "utf8"),
		readFile(papersContentPath, "utf8"),
	]);

	assert.match(friendsPage, /getEntry\("spec", "friends"\)/);
	assert.match(papersPage, /getEntry\("spec", "papers"\)/);
	assert.match(papersContent, /Multi-hop Question Answering/);
});

test("publish tooling avoids local and generated files", async () => {
	const [makefile, gitignore] = await Promise.all([
		readFile(makefilePath, "utf8"),
		readFile(gitignorePath, "utf8"),
	]);

	assert.match(makefile, /^publish:/m);
	assert.match(makefile, /^verify:/m);
	assert.match(makefile, /git add -A/);
	assert.match(gitignore, /^node_modules\/$/m);
	assert.match(gitignore, /^dist\/$/m);
	assert.match(gitignore, /^\.astro\/$/m);
	assert.match(gitignore, /^\.vscode\/$/m);
	assert.doesNotMatch(gitignore, /^package-lock\.json$/m);
	assert.match(gitignore, /^参考图\*\.png$/m);
	assert.match(gitignore, /^修改要求\.png$/m);
});

test("favicon generation script creates avatar icons", async () => {
	const script = await readFile(faviconScriptPath, "utf8");

	assert.match(script, /src\/assets\/images\/avatar\.jpeg/);
	assert.match(script, /favicon-32\.png/);
	assert.match(script, /apple-touch-icon\.png/);
	assert.match(script, /favicon-192\.png/);
});
