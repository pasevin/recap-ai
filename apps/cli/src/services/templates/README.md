# Summary Template System

## Overview

The template system provides a predictable, extensible way to generate AI-powered activity summaries. It enforces consistent structure while allowing flexibility in content generation.

## Key Benefits

1. **Predictable Output**: Templates define exact sections and formatting, reducing variability in AI responses
2. **Extensibility**: Easy to create new templates for different use cases (standups, reports, reviews, etc.)
3. **Maintainability**: Template logic is separated from the AI service, making it easier to update and test
4. **Consistency**: All summaries follow the same structural patterns

## Architecture

### Components

```
templates/
├── types.ts           # TypeScript interfaces and types
├── registry.ts        # Central template management
├── renderer.ts        # Template rendering logic
├── default-template.ts # Default standup template
└── index.ts          # Public API exports
```

### Flow

```
1. Activity Data → Template Context
2. Template Context + Template → Renderer
3. Renderer → System Prompt
4. System Prompt + Data → AI
5. AI → Structured Summary
```

## Creating a New Template

### Step 1: Define Your Template

Create a new file like `executive-template.ts`:

```typescript
import { SummaryTemplate } from './types';

export const executiveTemplate: SummaryTemplate = {
  metadata: {
    id: 'executive-report-v1',
    name: 'Executive Report',
    description: 'High-level summary for leadership',
    version: '1.0.0',
    useCases: ['executive-reports', 'leadership-updates'],
    formats: ['markdown'],
    perspectives: ['third-person'],
  },

  systemPromptPrefix: `You are creating an executive summary for leadership review.`,

  formattingRules: [
    'Use clear, business-focused language',
    'Emphasize impact and outcomes',
    'Keep technical details minimal',
  ],

  constraints: [
    'Focus on business value, not implementation details',
    'Highlight blockers and risks prominently',
  ],

  sections: [
    {
      id: 'executive-summary',
      name: 'Executive Summary',
      required: true,
      instruction: 'Provide a 2-3 sentence overview of key outcomes',
      dataSources: ['both'],
      format: 'paragraph',
    },
    // Add more sections...
  ],

  timeframeHandling: {
    displayFormat: 'YYYY-MM-DD to YYYY-MM-DD',
    includeInHeader: true,
    includeInFooter: false,
  },

  perspectiveInstructions: {
    'third-person': 'Refer to the individual professionally by name',
  },
};
```

### Step 2: Register Your Template

In `registry.ts`, import and register:

```typescript
import { executiveTemplate } from './executive-template';

constructor() {
  this.register(defaultTemplate);
  this.register(executiveTemplate); // Add this
}
```

### Step 3: Use Your Template

```typescript
const summary = await openaiService.generateActivitySummary(
  activityData,
  timeframe,
  true, // enhanced
  'markdown', // format
  actualDates,
  'third-person',
  'Jane Smith',
  'executive-report-v1' // Your template ID
);
```

## Template Structure

### Sections

Each section defines:

- **id**: Unique identifier
- **name**: Display heading
- **required**: Whether it must appear
- **instruction**: What the AI should include
- **dataSources**: Which data to use (github/linear/both)
- **format**: Output format (paragraph/list/table/blockquote/heading)
- **subsections**: Nested sections (optional)
- **showWhen**: Conditional rendering rules (optional)

### Conditional Rendering

Sections can be conditionally shown based on data availability:

```typescript
{
  id: 'pull-requests',
  name: 'Pull Requests',
  required: false,
  showWhen: {
    hasGitHubData: true,
    hasPullRequests: true,
  },
  // ... other fields
}
```

### Formatting Options

- `paragraph`: Prose text
- `list`: Bullet points
- `table`: Markdown tables
- `blockquote`: Quoted sections
- `heading`: Section headers

## Advanced Features

### Perspective Handling

Templates support different narrative perspectives:

```typescript
perspectiveInstructions: {
  'first-person': 'Write as "I accomplished..."',
  'third-person': 'Write as "[Name] accomplished..."',
}
```

### Enhanced vs Basic Mode

The `enhanced` parameter affects:

- Amount of detail included
- Token limits (1500 vs 2000)
- Whether to include statistics

### Data Context

The renderer automatically builds context from activity data:

```typescript
interface TemplateContext {
  timeframe: string;
  actualDates?: { startDate: Date; endDate: Date };
  perspective: NarrativePerspective;
  perspectiveName?: string;
  enhanced: boolean;
  hasGitHubData: boolean;
  hasLinearData: boolean;
  hasCommits: boolean;
  hasPullRequests: boolean;
  hasIssues: boolean;
  hasActiveLinearIssues: boolean;
}
```

## Best Practices

### 1. Clear Instructions

Be specific in section instructions:

Bad: "List the work"
Good: "For each PR, include: repository name, technical change, and business impact"

### 2. Appropriate Constraints

Add constraints to prevent common AI issues:

```typescript
constraints: [
  'ONLY use identifiers explicitly provided in the data',
  'NEVER invent or make up issue numbers',
  'Include all required sections even if no data available',
];
```

### 3. Hierarchical Structure

Use subsections for better organization:

```typescript
{
  id: 'completed-work',
  name: 'Completed Work',
  subsections: [
    { id: 'pull-requests', name: 'Pull Requests', ... },
    { id: 'technical-highlights', name: 'Technical Highlights', ... },
  ],
}
```

### 4. Format-Specific Templates

Create separate templates for different output formats if needed:

- `standup-text-v1`: Plain text for Slack
- `standup-markdown-v1`: Rich markdown for web
- `standup-presentation-v1`: Slide-friendly format

## Testing Templates

When creating a new template:

1. **Test with varying data**: Empty data, minimal data, rich data
2. **Check all perspectives**: First-person and third-person
3. **Verify conditionals**: Ensure showWhen conditions work correctly
4. **Review AI output**: Generate multiple summaries to check consistency
5. **Validate structure**: Ensure all required sections appear

## Migration Guide

### From Old Prompt System

The old system used inline prompts. To migrate:

1. **Identify your prompt structure**: What sections does it have?
2. **Create a template**: Define sections matching your structure
3. **Extract constraints**: Move critical rules to `constraints` array
4. **Test thoroughly**: Compare outputs before deploying

### Example Migration

Old inline prompt:

```typescript
const prompt = `You are an engineer summarizing work.
Structure:
1. Completed work
2. Current work
3. Challenges`;
```

New template:

```typescript
{
  sections: [
    { id: 'completed', name: 'Completed Work', ... },
    { id: 'current', name: 'Current Work', ... },
    { id: 'challenges', name: 'Challenges', ... },
  ],
}
```

## Future Enhancements

Potential improvements to the template system:

1. **Template Inheritance**: Base templates that can be extended
2. **Dynamic Sections**: Sections that adapt based on data volume
3. **Custom Formatters**: Per-section output transformations
4. **Template Validation**: Schema validation for templates
5. **Version Management**: Handle template version upgrades
6. **A/B Testing**: Compare different template variations
7. **User-Uploaded Templates**: Allow users to create custom templates via UI

## Troubleshooting

### AI Ignoring Structure

**Problem**: AI doesn't follow the defined structure

**Solutions**:

- Make instructions more explicit
- Add stronger constraints
- Increase specificity in section instructions
- Review prompt length (may be truncated)

### Missing Sections

**Problem**: Required sections not appearing

**Solutions**:

- Check `showWhen` conditions
- Verify data availability in context
- Ensure `required: true` is set
- Add "include even if empty" instructions

### Inconsistent Output

**Problem**: Summaries vary significantly

**Solutions**:

- Add more specific formatting rules
- Increase constraint specificity
- Use stricter section instructions
- Consider lowering temperature (currently 0.5)

## Support

For questions or issues with the template system:

1. Check this README
2. Review existing templates for examples
3. Consult `types.ts` for full interface definitions
4. Test with the default template first

## Changelog

### v1.0.0 (2025-10-01)

- Initial template system implementation
- Default standup template
- Registry and renderer
- Conditional section rendering
- Perspective support
