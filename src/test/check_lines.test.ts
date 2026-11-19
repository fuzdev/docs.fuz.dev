import { describe, test, assert } from 'vitest';

import { claude_check_lines } from '#routes/projects/check_lines.ts';

describe('claude_check_lines', () => {
	test('finds a commented check command in a code block, with its line', () => {
		const markdown = `# repo

## Gro commands

\`\`\`bash
gro check     # typecheck, test, lint, format check (run before committing)
gro typecheck # typecheck only
npm run check                      # the full check
\`\`\`
`;
		assert.deepEqual(claude_check_lines(markdown), [
			{
				line: 6,
				command: 'gro check',
				comment: 'typecheck, test, lint, format check (run before committing)',
				before_committing: true
			},
			{ line: 8, command: 'npm run check', comment: 'the full check', before_committing: false }
		]);
	});

	test('takes any command a comment marks as the one to run before committing', () => {
		const markdown = '```\ncargo xtask check   # everything (Run before committing)\n```\n';
		assert.deepEqual(claude_check_lines(markdown), [
			{
				line: 2,
				command: 'cargo xtask check',
				comment: 'everything (Run before committing)',
				before_committing: true
			}
		]);
	});

	test('leaves out prose, an uncommented command, and a check command with arguments', () => {
		const markdown = `Run \`gro check\` # before committing, always.

gro check     # typecheck (run before committing)

\`\`\`bash
gro check
gro check --build   # with a build
# gro check is the gate
\`\`\`
`;
		assert.deepEqual(claude_check_lines(markdown), []);
	});

	test('a fence closes only on its own character, at least as long', () => {
		const markdown =
			'````md\n```bash\ngro check # inner\n```\ngro check # still inside\n````\ngro check # outside\n';
		assert.deepEqual(
			claude_check_lines(markdown).map((line) => line.line),
			// the inner fence opens nothing, and its close does not end the outer block
			[3, 5]
		);
	});
});
