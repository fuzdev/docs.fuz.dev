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
├── skill_doc.ts               # [hand-written] the `SkillDoc` type the data files carry
├── SkillDocPage.svelte        # [hand-written] one skill document as a page
├── +layout.svelte             # [hand-written] a width wrapper
├── +page.svelte               # [hand-written] skills index and install steps
└── {skill-name}/
    ├── skill_data.ts          # [generated] markdown content as exported strings
    ├── +page.svelte           # [generated] index — rendered SKILL.md
    └── references/
        ├── +page.svelte       # [generated] references index
        └── {slug}/+page.svelte # [generated] one per reference doc
```

The site's shell (`src/routes/+layout.svelte`, see the root `CLAUDE.md`)
provides the sidebar,
whose `SiteNav` lists every skill from the manifest, with a skill's
references expanding as sub-items while its route is active.

## Gen file pattern

A single `skill_docs.gen.ts` auto-discovers skills and generates all routes:

1. Scans `skills/` for subdirectories containing `SKILL.md`
2. For each skill: reads `SKILL.md`, strips YAML frontmatter (top-level keys
   only; a nested map like `metadata` is skipped), extracts title
3. Reads `references/*.md` if the directory exists (skills without references
   get an empty array). Each reference **must** have a one-line `description`
   in YAML frontmatter — the gen throws otherwise, so descriptions can't
   silently drift when references are added or renamed
4. Generates `skills_manifest.ts` — lightweight metadata (name, title,
   description, each route's path, reference slugs/titles/descriptions) for
   the site nav and the index pages. It is emitted `as const`, so a `path` is
   a literal that `resolve` checks against the routes that exist
5. Generates per-skill `skill_data.ts` with content strings (via
   `JSON.stringify` for safe escaping), rewriting relative `.md` links to the
   generated route shape (`./SKILL.md` → the skill index, `./foo.md` → `./foo`),
   each with the path of its source file
6. Generates `+page.svelte` files, each a `SkillDocPage` given one document

`SkillDocPage.svelte` is where a skill page's markup lives: the `<title>`,
the Markdown rendered with `Mdz`, and the link to the source file. Change
how every skill page looks there, not in the generator's templates.

Content is split per skill, not per page: `skills_manifest.ts` has no
markdown content (used by the nav and index pages), while a skill's
`skill_data.ts` holds all of its documents, loaded when navigating to any of
them.

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
4. The site nav and index page update automatically

The same `gro gen` follows any edit under `skills/`; `gro check` fails on a
generated file that drifted.
