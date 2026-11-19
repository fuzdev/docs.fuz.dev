import { describe, test, assert } from 'vitest';

import { yaml_subset_parse, type YamlValue } from '#routes/projects/yaml_subset.ts';

// a parsed value as plain objects, to compare with a literal
const plain = (value: YamlValue): unknown => {
	if (value instanceof Map) {
		return Object.fromEntries(Array.from(value, ([key, v]) => [key, plain(v)]));
	}
	return Array.isArray(value) ? value.map(plain) : value;
};

const parse = (yaml: string): unknown => plain(yaml_subset_parse(yaml));

describe('yaml_subset_parse', () => {
	test('reads nested mappings, keeping every scalar as the string written', () => {
		assert.deepEqual(parse('a:\n  b: 1\n  c: true\nd: x y\n'), {
			a: { b: '1', c: 'true' },
			d: 'x y'
		});
	});

	test('a key with nothing after it is null, and `{}` is an empty mapping', () => {
		assert.deepEqual(parse('on:\n  workflow_dispatch:\n  push:\npermissions: {}\n'), {
			on: { workflow_dispatch: null, push: null },
			permissions: {}
		});
	});

	test("reads a sequence of scalars and of mappings, indented or at its key's own column", () => {
		const yaml = `steps:
  - uses: a/b@v1
    with:
      x: '1'
  - run: npm ci
  -   name: Wide
      run: echo
list:
- one
- 'two: 2'
`;
		assert.deepEqual(parse(yaml), {
			steps: [
				{ uses: 'a/b@v1', with: { x: '1' } },
				{ run: 'npm ci' },
				{ name: 'Wide', run: 'echo' }
			],
			list: ['one', 'two: 2']
		});
	});

	test('reads a flow sequence on one line, quoted or plain', () => {
		assert.deepEqual(parse('a: [main]\nb: [\'**\', "v*"]\nc: []\nd: [x, y] # why\n'), {
			a: ['main'],
			b: ['**', 'v*'],
			c: [],
			d: ['x', 'y']
		});
	});

	test('drops a comment on its own line or after a value, and keeps a # inside a word or quotes', () => {
		assert.deepEqual(parse("# top\na: x # why\n\n  # between\nb: 'x # y'\nc: x#y\n"), {
			a: 'x',
			b: 'x # y',
			c: 'x#y'
		});
	});

	test('reads quoted scalars with their escapes', () => {
		assert.deepEqual(parse("a: 'it''s'\nb: \"x\\ny \\\"z\\\"\"\nc: '17 6 * * 1'\n"), {
			a: "it's",
			b: 'x\ny "z"',
			c: '17 6 * * 1'
		});
	});

	test('reads a literal block with its own indentation kept, and a folded block as one line', () => {
		const yaml = `steps:
  - name: Two
    run: |
      case "$x" in
        a) echo a ;; # not a comment
      esac

      cargo test --locked
  - run: >-
      cargo xtask gates
      --check
  - run: | # why
      echo done
`;
		assert.deepEqual(parse(yaml), {
			steps: [
				{
					name: 'Two',
					run: 'case "$x" in\n  a) echo a ;; # not a comment\nesac\n\ncargo test --locked'
				},
				{ run: 'cargo xtask gates --check' },
				{ run: 'echo done' }
			]
		});
	});

	test("a block scalar is the lines at its first line's indentation, and a comment indented less ends it", () => {
		const yaml = `steps:
  - run: |
        echo hi
      # a comment, not the command
    name: x
`;
		assert.deepEqual(parse(yaml), { steps: [{ run: 'echo hi', name: 'x' }] });
		// a line of text indented less than the block's first is no part of it, and nothing else
		assert.throws(() => yaml_subset_parse('a: |\n    x\n   y\n'));
	});

	test('a folded block is read only when it folds to one line', () => {
		assert.deepEqual(parse('a: >\n  one\n  two\n\nb: x\n'), { a: 'one two', b: 'x' });
		// YAML keeps these line breaks, which joining with a space would lose
		assert.throws(() => yaml_subset_parse('a: >\n  echo a\n    && echo b\n'));
		assert.throws(() => yaml_subset_parse('a: >\n  one\n\n  two\n'));
	});

	test('an empty sequence item is null, and the items after it are its siblings', () => {
		assert.deepEqual(parse('a:\n  -\n  - foo\n'), { a: [null, 'foo'] });
		assert.deepEqual(parse('- # nothing\n- a\n'), [null, 'a']);
		assert.deepEqual(parse('-\n  b: 1\n- c\n'), [{ b: '1' }, 'c']);
	});

	test('a comma may trail the last item of a flow sequence', () => {
		assert.deepEqual(parse("a: [x, y,]\nb: ['x',]\n"), { a: ['x', 'y'], b: ['x'] });
	});

	test('an empty file is null', () => {
		assert.strictEqual(parse('# only a comment\n\n'), null);
	});

	test('refuses what is outside the subset, naming the line', () => {
		const refused: Array<[yaml: string, why: string]> = [
			['a: &anchor x\n', 'an anchor'],
			['a: *alias\n', 'an alias'],
			['a: !tag x\n', 'a tag'],
			['---\na: 1\n', 'a document marker'],
			['a: { b: 1 }\n', 'a flow mapping with entries'],
			['a: x\n  y\n', 'a scalar that continues'],
			['a: [x,\n  y]\n', 'a flow sequence over two lines'],
			['a: [[x]]\n', 'a nested flow sequence'],
			['a:\n\tb: 1\n', 'a tab in indentation'],
			['a: 1\na: 2\n', 'a key written twice'],
			['a: |2\n    x\n', 'a block scalar with an indentation indicator'],
			['a: "x\n', 'a quote with no end'],
			['a: 1\r\n', 'a carriage return'],
			['- - x\n', 'a sequence inside a sequence item'],
			['a:\n  b: 1\n c: 2\n', 'a line between two indentations'],
			['? a\n: b\n', 'a complex key'],
			['a: [k: v]\n', 'a mapping in a flow sequence'],
			['a: [x, , y]\n', 'an empty item in a flow sequence'],
			['a: [x, {y: 1}]\n', 'a flow mapping in a flow sequence'],
			['a: {}x\n', 'text after an empty flow mapping']
		];
		for (const [yaml, why] of refused) {
			assert.throws(() => yaml_subset_parse(yaml), Error, undefined, why);
		}
		assert.throws(() => yaml_subset_parse('a: 1\nb: &x y\n'), /^line 2: /);
	});
});
