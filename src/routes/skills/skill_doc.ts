/**
 * The shape of one skill document as the generated `skill_data.ts` files
 * carry it.
 *
 * @module
 */

/** A skill's `SKILL.md` or one of its references. */
export interface SkillDoc {
	/** The route segment, or `overview` for `SKILL.md`. */
	slug: string;
	/** The document's first heading. */
	title: string;
	/** The Markdown without its frontmatter, with relative `.md` links rewritten to routes. */
	content: string;
	/** The source file's path in this repo. */
	source: string;
}
