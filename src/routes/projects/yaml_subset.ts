/**
 * Reads the subset of YAML the stack's workflow files are written in, for the
 * snapshot task, and refuses everything else. It is not a YAML parser: a
 * construct it does not know is an error, never a guess, so a workflow that
 * starts using one stops the snapshot and does not bend it.
 *
 * Read: block mappings with plain keys, block sequences, plain and quoted
 * scalars, flow sequences of scalars on one line, `{}`, literal block
 * scalars, folded block scalars whose lines fold to one, and comments.
 * Refused: anchors, aliases, tags, documents, flow mappings, a scalar that
 * continues on a second line, a folded block with a blank or a more indented
 * line, tabs in indentation, and a key written twice.
 *
 * @module
 */

/**
 * A value read from YAML. Every scalar is the string as written, so `true`
 * and `24.14` are not converted, and a key with nothing after it is `null`.
 * A block scalar is its text without the line break at its end, whatever its
 * chomping indicator asks for.
 */
export type YamlValue = string | null | Array<YamlValue> | Map<string, YamlValue>;

const KEY = /^([\w.-]+):(?:[ ]+(.*))?$/;

// a plain scalar ends at a `#` that follows a space
const strip_comment = (text: string): string => text.replace(/(^|\s)#.*$/, '').trim();

const is_dash = (text: string): boolean => /^-(\s|$)/.test(text);

/**
 * Parses a YAML document in the subset this module reads.
 *
 * @throws Error naming the line, for anything outside the subset
 */
export const yaml_subset_parse = (yaml: string): YamlValue => {
	if (yaml.includes('\r')) throw new Error('a file with carriage returns is not read');
	const lines = yaml.split('\n');
	let cursor = 0;

	const fail = (message: string, at: number = cursor): never => {
		throw new Error(`line ${at + 1}: ${message}`);
	};
	const indent_of = (line: string): number => {
		const indent = line.search(/\S/);
		if (line.slice(0, indent).includes('\t')) fail('a tab in indentation');
		return indent;
	};
	// moves past blank lines and comments, and says whether a line is left
	const skip = (): boolean => {
		while (cursor < lines.length) {
			const trimmed = lines[cursor]!.trim();
			if (trimmed !== '' && !trimmed.startsWith('#')) return true;
			cursor++;
		}
		return false;
	};

	const quoted = (text: string): { value: string; rest: string } => {
		const quote = text[0]!;
		let value = '';
		for (let i = 1; i < text.length; i++) {
			const char = text[i]!;
			if (quote === "'") {
				if (char !== "'") value += char;
				else if (text[i + 1] === "'") {
					value += "'";
					i++;
				} else return { value, rest: text.slice(i + 1) };
			} else if (char === '\\') {
				const escaped = text[++i];
				if (escaped === 'n') value += '\n';
				else if (escaped === 't') value += '\t';
				else if (escaped === '"' || escaped === '\\' || escaped === '/') value += escaped;
				else fail(`an escape this cannot read: \\${escaped}`);
			} else if (char === '"') return { value, rest: text.slice(i + 1) };
			else value += char;
		}
		return fail('a quoted scalar with no end on its line');
	};

	// a plain scalar, which may not begin with a character YAML gives a meaning to
	const plain = (text: string): string => {
		if (/^[&*!|>%@`{[]/.test(text)) fail(`a value this cannot read: ${text}`);
		return text;
	};

	const scalar = (text: string): string => {
		if (text.startsWith("'") || text.startsWith('"')) {
			const { value, rest } = quoted(text);
			if (strip_comment(rest) !== '') fail('text after a quoted scalar');
			return value;
		}
		return plain(strip_comment(text));
	};

	const flow_sequence = (text: string): Array<YamlValue> => {
		const items: Array<YamlValue> = [];
		let rest = text.slice(1).trim();
		for (;;) {
			// the end, after no item or after a comma that trails the last one
			if (rest.startsWith(']')) {
				if (strip_comment(rest.slice(1)) !== '') fail('text after a flow sequence');
				return items;
			}
			if (rest === '') fail('a flow sequence that does not end on its line');
			let value: string;
			if (rest.startsWith("'") || rest.startsWith('"')) {
				({ value, rest } = quoted(rest));
				rest = rest.trim();
			} else {
				const end = rest.search(/[,\]]/);
				if (end === -1) fail('a flow sequence that does not end on its line');
				value = plain(rest.slice(0, end).trim());
				if (value === '') fail('an empty item in a flow sequence');
				// `[a: b]` is a mapping in YAML, and this reads no flow mapping
				if (/:(\s|$)/.test(value)) fail('a flow mapping');
				rest = rest.slice(end);
			}
			items.push(value);
			if (rest.startsWith(',')) rest = rest.slice(1).trim();
			else if (!rest.startsWith(']')) fail('a flow sequence this cannot read');
		}
	};

	// the lines under a `|` or `>` header the caller has checked: every line at the
	// indentation of the first, or blank, until one indented less
	const block_scalar = (header: string, parent: number): string => {
		const start = cursor;
		const block: Array<string> = [];
		let indent: number | null = null;
		while (cursor < lines.length) {
			const line = lines[cursor]!;
			if (line.trim() !== '') {
				const at = indent_of(line);
				indent ??= at;
				// a block ends at a line indented less than its first, which the caller then
				// reads as a comment, as the next key, or as an error
				if (at <= parent || at < indent) break;
			}
			block.push(line);
			cursor++;
		}
		while (block.length > 0 && block[block.length - 1]!.trim() === '') block.pop();
		const dedented = block.map((line) => line.slice(indent ?? 0));
		if (!header.startsWith('>')) return dedented.join('\n');
		// a folded scalar joins its lines with a space only when every line is at one
		// indentation with no blank between, which is the only folding this does
		for (const [index, line] of dedented.entries()) {
			if (line.trim() === '' || /^\s/.test(line)) {
				fail('a folded block with a blank or a more indented line', start + index);
			}
		}
		return dedented.map((line) => line.trimEnd()).join(' ');
	};

	const inline_empty_map = (text: string): Map<string, YamlValue> | null => {
		if (!text.startsWith('{')) return null;
		if (strip_comment(text) !== '{}') fail('a flow mapping');
		return new Map();
	};

	// the value after `key:` or `- `, where `parent` is the indentation of the line it is on
	const value_after = (rest: string | undefined, parent: number, of_key: boolean): YamlValue => {
		const text = rest === undefined ? '' : rest.trim();
		if (text.startsWith('|') || text.startsWith('>')) {
			if (!/^[|>][+-]?$/.test(strip_comment(text))) {
				fail(`a block scalar this cannot read: ${text}`);
			}
			cursor++;
			return block_scalar(text, parent);
		}
		if (strip_comment(text) !== '') {
			const value = text.startsWith('[')
				? flow_sequence(text)
				: (inline_empty_map(text) ?? scalar(text));
			cursor++;
			if (skip() && indent_of(lines[cursor]!) > parent) {
				fail('a value that continues on a second line');
			}
			return value;
		}
		cursor++;
		if (!skip()) return null;
		const next = lines[cursor]!;
		const indent = indent_of(next);
		if (indent > parent) return node(indent);
		// a key's sequence may sit at the key's own indentation; under a dash, a dash at
		// that indentation is the next item
		if (of_key && indent === parent && is_dash(next.trim())) return sequence(indent);
		return null;
	};

	const mapping = (indent: number): Map<string, YamlValue> => {
		const map: Map<string, YamlValue> = new Map();
		while (skip()) {
			const line = lines[cursor]!;
			const at = indent_of(line);
			if (at < indent) break;
			if (at > indent) fail('a line indented past its mapping');
			const text = line.trim();
			if (is_dash(text)) break;
			const match = KEY.exec(text);
			if (!match) fail(`a key this cannot read: ${text}`);
			const key = match![1]!;
			if (map.has(key)) fail(`the key ${key} is written twice`);
			map.set(key, value_after(match![2], indent, true));
		}
		return map;
	};

	const sequence = (indent: number): Array<YamlValue> => {
		const items: Array<YamlValue> = [];
		while (skip()) {
			const line = lines[cursor]!;
			const at = indent_of(line);
			if (at < indent) break;
			if (at > indent) fail('a line indented past its sequence');
			const text = line.trim();
			if (!is_dash(text)) break;
			const dash = /^-(\s+)(\S.*)$/.exec(text);
			if (!dash || strip_comment(dash[2]!) === '') {
				items.push(value_after(undefined, indent, false));
				continue;
			}
			const content_indent = indent + 1 + dash[1]!.length;
			const rest = dash[2]!;
			if (is_dash(rest)) fail('a sequence inside a sequence item');
			if (KEY.test(rest)) {
				// an item that is a mapping: its first key stands where the dash's text does
				lines[cursor] = ' '.repeat(content_indent) + rest;
				items.push(mapping(content_indent));
			} else {
				items.push(value_after(rest, indent, false));
			}
		}
		return items;
	};

	const node = (indent: number): YamlValue =>
		is_dash(lines[cursor]!.trim()) ? sequence(indent) : mapping(indent);

	if (!skip()) return null;
	if (lines[cursor]!.startsWith('---') || lines[cursor]!.startsWith('%')) {
		fail('a document marker or directive');
	}
	const first = indent_of(lines[cursor]!);
	const result = node(first);
	if (skip()) fail('a line outside the document');
	return result;
};
