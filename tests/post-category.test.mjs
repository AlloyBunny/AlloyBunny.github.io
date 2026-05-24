import assert from "node:assert/strict";
import { test } from "node:test";

import {
	getCategoryFromPostPath,
	resolvePostCategory,
} from "../src/utils/post-category.ts";

test("derives category from the first folder under posts", () => {
	assert.equal(getCategoryFromPostPath("技术/md转pdf的自动化方案.md"), "技术");
	assert.equal(getCategoryFromPostPath("手册/linux/配置.md"), "手册");
	assert.equal(
		getCategoryFromPostPath("src/content/posts/经验/吃一堑长一智.md"),
		"经验",
	);
});

test("uses the folder category before frontmatter category", () => {
	assert.equal(
		resolvePostCategory({
			id: "技术/md转pdf的自动化方案.md",
			slug: "技术/md转pdf的自动化方案",
			data: { category: "旧分类" },
		}),
		"技术",
	);
});

test("falls back to frontmatter category for root-level posts", () => {
	assert.equal(
		resolvePostCategory({
			id: "随笔.md",
			slug: "随笔",
			data: { category: "生活" },
		}),
		"生活",
	);
	assert.equal(
		resolvePostCategory({
			id: "随笔.md",
			slug: "随笔",
			data: { category: "" },
		}),
		null,
	);
});
