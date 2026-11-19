# docs.fuz.dev

> experimental AI-generated docs and
> [skills](https://agentskills.io/) for [Fuz](https://fuz.dev/),
> a zippy stack for human agency

[docs.fuz.dev](https://docs.fuz.dev/)

This repo is the source of two agent skills and of the site that renders
them. The site also has:

- [coherence](https://docs.fuz.dev/coherence) and
  [values](https://docs.fuz.dev/values): checkable claims about how the stack
  is built
- [projects](https://docs.fuz.dev/projects): a page per project, computed
  from those claims and from what each repo's own files declare
- a [glossary](https://docs.fuz.dev/glossary) and a few
  [browser tools](https://docs.fuz.dev/tools)

It is written by agents and inconsistently reviewed; where it and the code
disagree, the code is right.

For what the stack is, see [fuz.dev/stack](https://www.fuz.dev/stack).

## Skills

The skills are in [./skills](./skills), in the
[Agent Skills](https://agentskills.io/) format, and browsable at
[docs.fuz.dev/skills](https://docs.fuz.dev/skills).

### fuz-stack

The [fuz-stack skill](./skills/fuz-stack/SKILL.md) has coding conventions and
patterns for `@fuzdev` TypeScript, Svelte 5, and Rust projects: naming, file
organization, testing, styling, schemas, dependency injection, TSDoc, code
generation, and the Rust workspaces' conventions, with a reference document
per topic.

### grimoire

The [grimoire skill](./skills/grimoire/SKILL.md) describes a pattern for a
personal meta-repo of mostly Markdown that coordinates work across sibling
repositories: lore (per-repo planning context), quests (cross-repo goals),
and arcs (long-running implementation efforts).

### Installation

**Claude.ai:**

1. Download or clone this repo
2. Go to [claude.ai/customize/skills](https://claude.ai/customize/skills)
3. Upload the `skills/fuz-stack/` or `skills/grimoire/` folder

**Claude Code:**

Copy a skill folder to `~/.claude/skills/`, e.g.
`~/.claude/skills/fuz-stack/`.

You may also try pointing your agent to:

- [github.com/fuzdev/docs.fuz.dev/blob/main/skills/fuz-stack/SKILL.md](https://github.com/fuzdev/docs.fuz.dev/blob/main/skills/fuz-stack/SKILL.md)
- [github.com/fuzdev/docs.fuz.dev/blob/main/skills/grimoire/SKILL.md](https://github.com/fuzdev/docs.fuz.dev/blob/main/skills/grimoire/SKILL.md)

## Contributing

[fuz.dev/contributing](https://www.fuz.dev/contributing)

## License

[0BSD](LICENSE)
