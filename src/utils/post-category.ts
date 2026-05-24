type PostLike = {
	id?: string;
	slug?: string;
	data?: {
		category?: string | null;
	};
};

const POSTS_DIR = "src/content/posts/";

export function getCategoryFromPostPath(postPath: string): string | null {
	let normalized = postPath.replaceAll("\\", "/").replace(/^\/+/, "");
	const postsDirIndex = normalized.indexOf(POSTS_DIR);
	if (postsDirIndex >= 0) {
		normalized = normalized.slice(postsDirIndex + POSTS_DIR.length);
	}

	const firstSlash = normalized.indexOf("/");
	if (firstSlash < 0) return null;

	const category = normalized.slice(0, firstSlash).trim();
	return category || null;
}

export function resolvePostCategory(post: PostLike): string | null {
	const categoryFromFolder = getCategoryFromPostPath(post.id || post.slug || "");
	if (categoryFromFolder) return categoryFromFolder;

	const categoryFromFrontmatter = post.data?.category;
	if (typeof categoryFromFrontmatter !== "string") return null;

	const trimmedCategory = categoryFromFrontmatter.trim();
	return trimmedCategory || null;
}
