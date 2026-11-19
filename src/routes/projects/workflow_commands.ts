/**
 * Reads the commands out of a GitHub Actions workflow file without a YAML
 * parser, for the snapshot task.
 *
 * @module
 */

/**
 * The commands a workflow's `run` steps hold, in file order. Reads the `run:` keys by
 * their indentation and nothing else of the YAML, so a step that only `uses` an action
 * is not here, and neither is a step's condition or working directory. A block scalar
 * is the more-indented lines under its key, with their common indentation removed.
 *
 * @throws Error for a file with carriage returns, or a `run:` value this cannot read
 * (a block scalar with an indentation indicator or a trailing comment)
 */
export const workflow_run_commands = (yaml: string): Array<string> => {
	if (yaml.includes('\r')) throw new Error('a workflow with carriage returns is not read');
	const lines = yaml.split('\n');
	const commands: Array<string> = [];
	for (let i = 0; i < lines.length; i++) {
		const match = /^(\s*)(?:-\s+)?run:\s*(.*)$/.exec(lines[i]!);
		if (!match) continue;
		const value = match[2]!.trim();
		if (!/^[|>]/.test(value)) {
			if (value) commands.push(value);
			continue;
		}
		if (!/^[|>][+-]?$/.test(value)) {
			throw new Error(`a block scalar this cannot read: run: ${value}`);
		}
		// the key's own column, past a list dash
		const indent = lines[i]!.indexOf('run:');
		const block: Array<string> = [];
		while (i + 1 < lines.length) {
			const next = lines[i + 1]!;
			if (next.trim() !== '' && next.search(/\S/) <= indent) break;
			block.push(next);
			i++;
		}
		while (block.length > 0 && block[block.length - 1]!.trim() === '') block.pop();
		const common = Math.min(
			...block.filter((line) => line.trim() !== '').map((line) => line.search(/\S/))
		);
		const dedented = block.map((line) => line.slice(common));
		// a folded scalar is one command over several lines
		commands.push(
			value.startsWith('>') ? dedented.map((line) => line.trim()).join(' ') : dedented.join('\n')
		);
	}
	return commands;
};
