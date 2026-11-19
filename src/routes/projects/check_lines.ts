/**
 * Finds the lines of a repo's `CLAUDE.md` that comment its check command, for
 * the snapshot task. Pure, so its rule can be tested without a checkout.
 *
 * The rule is mechanical so that a page can quote a repo's own words without
 * judging them: a repo that states its gate in a sentence, or in another
 * file, has no line here, and a page that shows these says so.
 *
 * @module
 */

import type { StackCheckLine } from './stack_snapshot.ts';

/** The commands that are a repo's check entry point wherever they are written. */
export const CHECK_COMMANDS: ReadonlyArray<string> = ['gro check', 'npm run check'];

/** What a comment says when it marks its command as the one to run before committing. */
const BEFORE_COMMITTING = /\brun before committing\b/i;

const COMMENTED_COMMAND = /^\s*(\S.*?)\s+#\s+(\S.*)$/;

/**
 * The lines in a Markdown file's fenced code blocks that are a command and a comment,
 * where the command is one of `CHECK_COMMANDS` or the comment says to run it before
 * committing. In file order.
 */
export const claude_check_lines = (markdown: string): Array<StackCheckLine> => {
	const found: Array<StackCheckLine> = [];
	let fence: string | null = null;
	for (const [index, line] of markdown.split('\n').entries()) {
		const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
		if (marker !== undefined) {
			// a fence closes on the same character, at least as long as the one that opened it
			if (fence === null) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
			continue;
		}
		if (fence === null) continue;
		const match = COMMENTED_COMMAND.exec(line);
		if (!match) continue;
		const command = match[1]!;
		const comment = match[2]!.trimEnd();
		const before_committing = BEFORE_COMMITTING.test(comment);
		if (!before_committing && !CHECK_COMMANDS.includes(command)) continue;
		found.push({ line: index + 1, command, comment, before_committing });
	}
	return found;
};
