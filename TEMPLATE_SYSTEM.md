# Template System

## Overview

This document consolidates the full design, implementation and operations of the summary templating system. It replaces prior docs: TEMPLATE_SYSTEM_IMPLEMENTATION.md, PRESCRIPTIVE_TEMPLATES_UPDATE.md, TEMPLATE_SYSTEM_V2_SUMMARY.md, and MARKDOWN_RENDERING_FIX.md.

## Goals

- Predictable, consistent output with strict sections and formatting
- Extensible: multiple templates, per-template rules, independent evolution
- Maintainable: template-first (markdown), minimal logic in code, no hardcoded strings

## Architecture

```
apps/cli/src/services/templates/
├── types.ts                 # Template types & normalization rules
├── registry.ts              # Template registry (getOrDefault)
├── renderer.ts              # Prompt rendering + normalization
├── default-template.ts      # Loads markdown + frontmatter json
└── markdown-templates/
    └── default-standup.md   # Prescriptive markdown template (+ frontmatter)
```

### Data Flow

1. CLI collects data → OpenAIService.buildTemplateContext
2. TemplateRegistry.getOrDefault(templateId)
3. TemplateRenderer.render → system prompt (includes prescriptive markdown template)
4. OpenAI responses.create → `output_text`
5. Renderer.applyNormalization(template, output_text) → final markdown
6. UI renders markdown via ReactMarkdown

## Prescriptive Markdown Templates

Templates are plain markdown files with placeholders and optional JSON frontmatter for normalization.

Frontmatter (optional):

```markdown
---json
{
  "normalization": {
    "listChildMarkers": ["Impact:", "Technical Details:", "Status:", "Scope:"],
    "indentSpaces": 2,
    "onlyAfterTopLevelBullet": true
  }
}
---
```

Template body (excerpt):

```markdown
> **Timeline:** [INSERT EXACT DATE RANGE]
>
> **Focus Areas:** [INSERT 2-4 HIGH-LEVEL THEMES]

## Completed Work

### Pull Requests & Commits

- **[repository-name]** – [brief technical description] (PR: [#[number]]([PR-URL]))
  - **Impact:** [business/technical impact]
  - **Technical Details:** [key implementation notes]
```

The AI fills only the placeholders. Formatting and headings must remain unchanged.

## Normalization Rules (Frontmatter)

To guarantee correct nested bullets even if the LLM emits flat bullets, per-template normalization rules are declared in frontmatter and applied post-generation:

- `listChildMarkers`: Strings used to detect child bullets to indent
- `indentSpaces`: Number of spaces to indent child bullets
- `onlyAfterTopLevelBullet`: Only normalize when previous non-empty line is a top-level `- ` list item

Renderer converts these strings into regexes and indents lines accordingly. No hardcoded strings exist in business logic.

## System Prompt (Renderer)

Renderer produces a strict instruction set and includes the markdown template without code fences. It instructs the AI:

- Not to add code fences
- To output only the filled template
- To keep exact structure and formatting

## OpenAI Integration

We use `responses.create` and read `output_text`. Output is cleaned of any accidental code fences and then normalized via `renderer.applyNormalization(template, markdown)`.

## UI Rendering

`apps/web/components/dashboard/summary-result.tsx` uses ReactMarkdown + remark-gfm with custom components. Nested lists are styled and indentation is handled correctly after normalization.

## Authoring New Templates

1. Create a new markdown file under `markdown-templates/`
2. (Optional) add JSON frontmatter with normalization rules
3. Reference it from a new `<your-template>.ts` and register in `registry.ts`
4. Set `markdownTemplate` and optional `normalizationRules` (frontmatter overrides can generate these at load time)

## Conventions (Enforced)

- Repository names must be bold: `**owner/repo**`
- Linear issue IDs must be bold: `**PLAT-123**`
- PR link inline immediately after parent description: `(PR: [#123](https://...))`
- No emojis in headings; use emojis only where specified
- Keep placeholders in square brackets and replace all of them

## Troubleshooting

### Markdown rendered as raw text

- Ensure template is not wrapped in code fences in system prompt (renderer handles this)
- Safety cleanup strips code fences if the AI adds them anyway

### Nested bullets not indented

- Use frontmatter `normalization.listChildMarkers` and `indentSpaces`
- Ensure the child markers match the exact start (e.g., `Impact:`)

## Future Enhancements

- Template schema validation/linting
- Frontmatter-driven variables / computed blocks
- Template inheritance & composition
- Visual template editor
- A/B testing multiple templates

## Change Log (Highlights)

- Migrated from instructional prompts to prescriptive markdown templates
- Moved formatting logic to templates + frontmatter-driven normalization
- Added output cleanup, removed code fences from prompts
- Inline PR links on parent bullets for PR entries
