# Skill docs routes

Browsable UI for AI agent skill markdown docs, rendered with mdz.

## Layout

```
skills/                        # source skill markdown
├── {skill-name}/
│   ├── SKILL.md               # main skill file (YAML frontmatter + content)
│   └── references/            # optional detailed topic docs
│       └── *.md
src/routes/skills/
├── skill_docs.gen.ts          # [single gen file] auto-discovers all skills
├── skills_manifest.ts         # [generated] lightweight metadata for nav + index
├── +layout.svelte             # [hand-written] data-driven sidebar from manifest
├── +page.svelte               # [hand-written] data-driven skills index
└── {skill-name}/
    ├── skill_data.ts          # [generated] markdown content as exported strings
    ├── +page.svelte           # [generated] index — rendered SKILL.md
    └── references/
        ├── +page.svelte       # [generated] references index
        └── {slug}/+page.svelte # [generated] one per reference doc
```

The shared `+layout.svelte` provides:

- Sticky top header with Breadcrumb
- Collapsible sidebar nav with `.menuitem` links and `.selected` highlighting
- Sub-items expand when that skill's route is active
- All skills discovered automatically from the manifest

## Gen file pattern

A single `skill_docs.gen.ts` auto-discovers skills and generates all routes:

1. Scans `skills/` for subdirectories containing `SKILL.md`
2. For each skill: reads `SKILL.md`, strips YAML frontmatter, extracts title
3. Reads `references/*.md` if the directory exists (skills without references
   get an empty array). Each reference **must** have a one-line `description`
   in YAML frontmatter — the gen throws otherwise, so descriptions can't
   silently drift when references are added or renamed
4. Generates `skills_manifest.ts` — lightweight metadata (name, title,
   description, reference slugs/titles/descriptions) for the layout, index
   pages, and the fuz-stack tome's reference table
5. Generates per-skill `skill_data.ts` with content strings (via
   `JSON.stringify` for safe escaping), rewriting relative `.md` links to the
   generated route shape (`./SKILL.md` → the skill index, `foo.md` → `foo`)
6. Generates `+page.svelte` files that render content with
   `<Mdz content={...} />`

Content is code-split: `skills_manifest.ts` has no markdown content (used by
layout/index), while per-skill `skill_data.ts` files hold full content (loaded
only when navigating to that skill).

## mdz rendering

The skill docs render through mdz's full grammar — headings, lists, tables,
blockquotes, code blocks, horizontal rules, and inline formatting (bold, italic,
strikethrough, links, inline code) all render correctly. mdz is a strict
dialect, not a CommonMark/GFM superset: single-delimiter emphasis (`*x*`,
intraword `_`) stays literal, a code span can't cross a line break, and
component/element tags render only when registered. See the fuz-stack skill's
`mdz.md` reference for the authoring traps.

## Adding a new skill

1. Create `skills/{name}/SKILL.md` with YAML frontmatter (name, description)
2. Optionally add `skills/{name}/references/*.md` for detailed topic docs —
   each with a one-line `description` in YAML frontmatter (required)
3. Run `gro gen` to generate route files
4. The layout sidebar and index page update automatically
