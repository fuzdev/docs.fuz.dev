# docs.fuz.dev

> experimental AI-generated docs and skills for Fuz, a zippy stack for human agency

docs.fuz.dev hosts experimental AI-generated documentation
and agent skills for the [Fuz](https://fuz.dev/) ecosystem, designed
for both human and machine consumption. Mostly poorly reviewed — conventions, patterns, and
reference material for `@fuzdev` projects.

**Website**: [docs.fuz.dev](https://docs.fuz.dev/)

For coding conventions, see Skill(fuz-stack).

## Scope

docs.fuz.dev is an **experimental AI-generated docs site and skills repo**:

- Static documentation site at docs.fuz.dev
- AI agent skills for AI-assisted development
- Coding convention references for the Fuz ecosystem
- Auto-generated API documentation

It's an actively evolving dumping ground, not polished documentation — some
content is plain slop. Library code, build tooling, and component
implementations live in their own repos.

## Gro commands

```bash
gro check      # typecheck, test (vitest is a devDependency), gen --check, format --check, lint (run before committing)
gro typecheck  # typecheck only (faster iteration)
gro test       # run tests with vitest
gro gen        # regenerate .gen files (skill docs)
gro build      # build for production (static adapter)
gro deploy     # build, commit, and push to deploy branch
```

## Key dependencies

- Svelte 5 - component framework with runes
- SvelteKit - application framework with static adapter
- fuz_css (@fuzdev/fuz_css) - semantic-first CSS framework and design system
- fuz_ui (@fuzdev/fuz_ui) - UI components, theming, docs system
- fuz_util (@fuzdev/fuz_util) - utility functions
- mdz (@fuzdev/mdz) - markdown dialect rendering the skill docs
- fuz_code (@fuzdev/fuz_code) - syntax highlighting
- blake3 (@fuzdev/blake3-wasm) - hashing for the /tools/hash route
- Gro (@fuzdev/gro) - build system and task runner

## Directory structure

```
src/
├── lib/              # stack repo metadata + dependency-graph modules
├── routes/           # SvelteKit routes
│   ├── docs/         # tome-based documentation
│   │   ├── api/      # auto-generated API docs
│   │   ├── introduction/ # ecosystem introduction
│   │   ├── fuz-stack/ # fuz stack conventions overview
│   │   ├── grimoire/ # grimoire pattern overview
│   │   ├── stack/    # stack libraries overview
│   │   └── library/  # library metadata
│   ├── skills/       # browsable skill docs rendered with mdz (auto-discovered)
│   │   ├── fuz-stack/ # generated from skills/fuz-stack/
│   │   └── grimoire/  # generated from skills/grimoire/
│   ├── tools/        # interactive tools (BLAKE3 hashing)
│   └── about/        # ecosystem links
skills/               # Claude Code skills (full tree under "Skill structure" below)
```

## SvelteKit app

Static docs site at docs.fuz.dev. Uses `@sveltejs/adapter-static` with
prerendering. Includes fuz_ui's tome-based documentation system and
auto-generated API docs.

### Routes

- `/` - Landing page with description, theme controls, ProjectLinks
- `/about` - Library summary, ecosystem links
- `/docs` - Tome-based documentation index
- `/docs/introduction` - Ecosystem introduction
- `/docs/fuz-stack` - Fuz stack conventions overview (links to skill docs)
- `/docs/grimoire` - Grimoire pattern overview
- `/docs/stack` - Stack libraries overview with an interactive, zoomable dependency map
- `/docs/api` - Auto-generated API documentation
- `/docs/api/[...module_path]` - Per-module API pages
- `/skills` - Skills index (auto-populated from manifest)
- `/skills/{skill}` - Browsable skill docs (generated, rendered with mdz)
- `/skills/{skill}/references` - Generated references index
- `/skills/{skill}/references/{slug}` - Per-reference skill doc pages (generated)
- `/tools` - Tools index
- `/tools/hash` - BLAKE3 hashing tool

Deploy with `gro deploy` (builds and pushes to deploy branch).

### Skill docs generation

`src/routes/skills/skill_docs.gen.ts` auto-discovers skills from `skills/`
and generates the browsable route pages rendered with mdz. See
`src/routes/skills/CLAUDE.md` for the full pattern.

## Claude Code Skills

Each skill lives in `skills/<skill-name>/` following the
[Agent Skills](https://agentskills.io/) format ([spec](https://github.com/anthropics/skills)).

| Skill       | Path                | Purpose                                                                        |
| ----------- | ------------------- | ------------------------------------------------------------------------------ |
| `fuz-stack` | `skills/fuz-stack/` | Coding conventions and patterns for `@fuzdev` TypeScript, Svelte 5, and Rust   |
| `grimoire`  | `skills/grimoire/`  | Grimoire pattern: lore, quests, and arcs for cross-repo coordination           |

### Skill structure

```
skills/
├── fuz-stack/
│   ├── SKILL.md                       # Main skill file (YAML frontmatter + instructions)
│   ├── references/                    # Detailed documentation loaded as needed
│   │   ├── code-generation.md         # Gro gen system (.gen.* files, dependencies, common patterns)
│   │   ├── css-patterns.md            # fuz_css styling conventions and utility classes
│   │   ├── db-patterns.md             # Query modules, named-column projections, schema drift guard (TS + Rust)
│   │   ├── dependency-injection.md    # Injectable *Deps interfaces, mock factories, composition patterns
│   │   ├── documentation-system.md    # Docs pipeline, Tome system, layout architecture, project setup
│   │   ├── fuz-schema.md              # fuz_schema conventions (strict objects, naming, brands, defaults, metadata)
│   │   ├── fuz-util.md                # fuz_util: Result, error helpers, Logger, Timings, concurrency, DAG, type utilities
│   │   ├── mdz.md                     # mdz dialect: grammar surface, component/element registration, rendering seam, autolink, preprocessor
│   │   ├── npm-dependencies.md        # Approved external npm package allowlist for TS/Svelte repos
│   │   ├── path-references.md         # Path typography in docs (navigational vs src/lib module vs code-shaped)
│   │   ├── rust-dependencies.md       # Approved crate allowlist, manifest conventions, isolate-by-crate
│   │   ├── rust-patterns.md           # Rust workspace setup, the gate, lints, errors, type modeling, DI, testing, CLI, system safety
│   │   ├── rust-perf.md               # Rust perf: measuring and gating changes, arenas, hot-path idioms, locks
│   │   ├── rust-spine.md              # Servers on the Rust spine: run_app shape, server toolkit, env, actions, realtime, check-release
│   │   ├── svelte-patterns.md         # Svelte 5 runes, contexts, snippets, attachments
│   │   ├── task-patterns.md           # Gro task system (.task.ts, TaskContext, error handling)
│   │   ├── testing-patterns.md        # Testing patterns, fixtures, mocks, assertions
│   │   ├── tsdoc-comments.md          # TSDoc style guide: tags, conventions, drift detection
│   │   ├── twin-impl.md               # TS ↔ Rust twin implementations: naming parity, enforcement, wire shapes, digests
│   │   └── wasm-patterns.md           # Rust binding crates: WASM (wasm-bindgen, component model), N-API, C FFI, npm packaging
└── grimoire/
    └── SKILL.md                       # Grimoire pattern (lore, quests, arcs)
```

## Project standards

- TypeScript strict mode
- Svelte 5 with runes API
- tsv with tabs, 100 char width
- Node >= 24.14
- Private package (not published to npm)

## Related projects

- [`fuz_css`](../fuz_css/CLAUDE.md) - semantic-first CSS framework
- [`fuz_ui`](../fuz_ui/CLAUDE.md) - UI components and docs system
- [`fuz_util`](../fuz_util/CLAUDE.md) - utility functions
- [`gro`](../gro/CLAUDE.md) - build system and task runner
