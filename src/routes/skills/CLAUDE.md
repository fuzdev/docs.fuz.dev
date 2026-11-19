# Skill docs routes

The skills' Markdown as browsable pages, rendered with mdz. One gen file
discovers the skills and generates every route.

## Layout

```
skills/                        # source skill markdown
├── {skill-name}/
│   ├── SKILL.md               # main skill file (YAML frontmatter + content)
│   └── references/            # optional detailed topic docs
│       └── *.md
src/routes/skills/
├── skill_docs.gen.ts          # [the gen file] discovers the skills, writes everything marked generated
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

## Gen file pattern

`skill_docs.gen.ts`:

1. Scans `skills/` for subdirectories containing `SKILL.md`
2. Reads each `SKILL.md`, strips the YAML frontmatter (top-level keys only;
   a nested map like `metadata` is skipped), and extracts the title
3. Reads `references/*.md` where the directory exists. Each reference
   **must** have a one-line `description` in its frontmatter: the gen throws
   otherwise, so a description can't silently go missing when a reference is
   added or renamed
4. Writes `skills_manifest.ts`: name, title, description, each route's path,
   and the references' slugs, titles and descriptions. It is emitted
   `as const`, so a `path` is a literal that `resolve` checks against the
   routes that exist
5. Writes each skill's `skill_data.ts`, its documents as strings (through
   `JSON.stringify`, for safe escaping), each with the path of its source
   file. Relative `.md` links are rewritten to the generated routes
   (`./SKILL.md` → the skill index, `./foo.md` → `./foo`)
6. Writes the `+page.svelte` files, each a `SkillDocPage` given one document

- **A skill page's markup lives in `SkillDocPage.svelte`**: the `<title>`,
  the Markdown rendered with `Mdz`, and the link to the source file. Change
  how every skill page looks there, not in the generator's templates.
- **Content is split per skill, not per page.** The manifest has no Markdown
  and is what the sidebar and the index pages load; a skill's
  `skill_data.ts` holds all of its documents, loaded on navigating to any of
  them.

## Adding or editing a skill

1. For a new skill, create `skills/{name}/SKILL.md` with YAML frontmatter
   (`name`, `description`), and optionally `skills/{name}/references/*.md`
2. Run `gro gen`, after any edit under `skills/`. The routes, the sidebar
   and the index pages follow from it, and `gro check` fails on a generated
   file that drifted

## mdz rendering

The skill docs render through mdz's full grammar: headings, lists, tables,
blockquotes, code blocks, horizontal rules, and inline formatting. mdz is a
strict dialect, not a CommonMark or GFM superset: single-delimiter emphasis
(`*x*`, intraword `_`) stays literal, a code span can't cross a line break,
and component and element tags render only when registered. The authoring
traps are in the fuz-stack skill's `mdz.md` reference.
