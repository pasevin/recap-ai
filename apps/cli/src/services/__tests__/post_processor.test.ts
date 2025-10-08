import { postProcessorService } from '../post_processor';

describe('PostProcessorService', () => {
  const markdown = `## Completed Work\n\n- **recap-ai** – Add caching layer (PR: #42)\n\n---\n\n### Summary Statistics\n\n| Metric        | Value           |\n| ------------- | --------------- |\n| PRs Merged    | [number]        |\n| Commits       | [number]        |\n| Issues Worked | [number]        |\n| Repositories  | [list of repos] |\n`;

  it('fills Summary Statistics and linkifies PR', () => {
    const data = {
      github: {
        pullRequests: [
          {
            title: 'Add caching layer',
            state: 'closed',
            createdAt: new Date().toISOString(),
            mergedAt: new Date().toISOString(),
            author: 'dev',
            url: 'https://github.com/acme/recap-ai/pull/42',
            repository: 'acme/recap-ai',
          },
        ],
        commits: [
          {
            sha: 'abc1234',
            message: 'feat: cache',
            date: new Date().toISOString(),
            author: 'dev',
            repository: 'acme/recap-ai',
          },
        ],
        issues: [],
      },
    } as any;

    const out = postProcessorService.apply(markdown, data);
    expect(out).toContain(
      '(PR: [#42](https://github.com/acme/recap-ai/pull/42))'
    );
    expect(out).toContain('| PRs Merged    | 1 |');
    expect(out).toContain('| Commits       | 1 |');
    expect(out).toContain('| Issues Worked | 0 |');
    expect(out).toContain('| Repositories  | acme/recap-ai |');
  });
});
