'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InputDescription } from '@/components/ui/input-description';
import { Copy, Download, AlertTriangle, FileText } from 'lucide-react';
import { useState } from 'react';

export interface SummaryResultProps {
  content?: string;
  json?: unknown;
  warnings?: string[] | unknown;
  formattedData?: string; // full formatted data fed to the model
}

const isInlineCodeNode = (node: unknown): boolean => {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const maybeNode = node as { type?: string };
  return maybeNode.type === 'inlineCode';
};

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1
      {...props}
      className="text-[1.75rem] sm:text-[1.95rem] uppercase tracking-[0.18em] text-accent font-semibold border-b border-border/70 pb-4 mb-8 mt-0"
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      {...props}
      className="text-xl sm:text-2xl uppercase tracking-[0.14em] text-accent font-semibold mt-10 mb-5 border-b border-border/60 pb-2"
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      {...props}
      className="text-lg sm:text-xl uppercase tracking-[0.1em] text-accent/90 font-semibold mt-8 mb-4"
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      {...props}
      className="text-base sm:text-lg tracking-[0.08em] text-accent/80 font-medium mt-6 mb-3"
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p
      {...props}
      className="text-base leading-[1.9] tracking-[0.01em] text-foreground/90 mb-5"
    >
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong {...props} className="font-semibold text-accent tracking-[0.02em]">
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em
      {...props}
      className="text-foreground/85 tracking-[0.01em] not-italic border-b border-dashed border-border/50"
    >
      {children}
    </em>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} className="space-y-3 pl-6 border-l-2 border-border/40 ml-1">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      {...props}
      className="space-y-3 pl-6 border-l-2 border-border/40 ml-1 list-decimal"
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li
      {...props}
      className="relative pl-5 text-base leading-[1.85] tracking-[0.01em] text-foreground/90"
    >
      <span
        className="pointer-events-none absolute left-0 top-[0.75rem] h-1.5 w-1.5 -translate-y-1/2 rounded-[1px] bg-accent shadow-[0_0_6px_var(--color-accent)]"
        aria-hidden="true"
      />
      <span className="block text-foreground/90">{children}</span>
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      {...props}
      className="relative border border-accent/40 bg-accent/10 px-6 py-5 text-base leading-[1.85] tracking-[0.01em] text-foreground/95"
    >
      <span
        className="absolute inset-y-0 left-0 w-1 bg-accent"
        aria-hidden="true"
      />
      {children}
    </blockquote>
  ),
  hr: (props) => (
    <hr {...props} className="my-10 border-t border-border/50 relative" />
  ),
  a: ({ children, ...props }) => (
    <a
      {...props}
      className="text-accent underline underline-offset-4 decoration-dotted decoration-accent/60 hover:text-accent/80 tracking-[0.015em]"
    >
      {children}
    </a>
  ),
  code: ({ children, node, ...props }) => {
    const className =
      'className' in props && typeof props.className === 'string'
        ? props.className
        : undefined;
    const inline = isInlineCodeNode(node);

    return (
      <code
        {...props}
        className={
          inline
            ? 'bg-accent/10 px-2 py-1 rounded-sm text-sm tracking-[0.02em] text-accent'
            : className || 'block'
        }
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      {...props}
      className="relative mt-4 mb-6 overflow-x-auto rounded-sm border border-border/70 bg-background/80 px-5 py-4 text-sm leading-relaxed tracking-[0.02em]"
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto mt-6 mb-8">
      <table
        {...props}
        className="w-full min-w-[420px] border border-border/60 bg-background/80 text-sm tracking-[0.01em]"
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead
      {...props}
      className="bg-accent/10 text-accent uppercase tracking-[0.12em]"
    >
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th {...props} className="border border-border/60 px-4 py-3 text-left">
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      {...props}
      className="border border-border/40 px-4 py-3 text-foreground/90"
    >
      {children}
    </td>
  ),
};

export function SummaryResult({
  content,
  json,
  warnings,
  formattedData,
}: SummaryResultProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  // Default Copy/Download to the human-facing report content
  const serialized = content ?? (json ? JSON.stringify(json, null, 2) : '');
  const validWarnings = Array.isArray(warnings)
    ? warnings.filter((w): w is string => typeof w === 'string')
    : [];
  const hasRaw = Boolean(formattedData) || json != null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serialized);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      // no-op in non-secure contexts/tests
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([serialized], {
        type: json ? 'application/json' : 'text/markdown',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = json ? 'summary.json' : 'summary.md';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // swallow download errors in tests
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Generated Report
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCopy} variant="outline" size="sm">
            <Copy className="h-3 w-3 mr-1.5" />
            {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-3 w-3 mr-1.5" />
            Download
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {validWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium">Warnings</span>
          </div>
          <ul className="space-y-1 text-sm">
            {validWarnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 bg-amber-600 rounded-full mt-2 flex-shrink-0 dark:bg-amber-400"></span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Outer tabs: Report vs Raw Data */}
      <Tabs defaultValue="report">
        {hasRaw ? (
          <TabsList>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>
        ) : null}

        <TabsContent value="report">
          {content ? (
            <div className="space-y-6 text-base leading-[1.85] tracking-[0.01em]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : null}
        </TabsContent>

        {hasRaw ? (
          <TabsContent value="raw">
            <Tabs defaultValue={formattedData ? 'raw-md' : 'raw-json'}>
              <TabsList>
                {formattedData ? (
                  <TabsTrigger value="raw-md">Markdown</TabsTrigger>
                ) : null}
                {json != null ? (
                  <TabsTrigger value="raw-json">JSON</TabsTrigger>
                ) : null}
              </TabsList>
              {formattedData ? (
                <TabsContent value="raw-md">
                  <InputDescription variant="terminal" className="mb-3">
                    This is the exact formatted markdown the AI received to
                    generate the report. It contains curated highlights, counts,
                    and instructions — not the raw event stream. Use this to
                    audit what the model actually saw.
                  </InputDescription>
                  <div className="h-px w-full bg-border/60 mb-3" />
                  <pre className="text-sm p-0 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {formattedData}
                  </pre>
                </TabsContent>
              ) : null}
              {json != null ? (
                <TabsContent value="raw-json">
                  <InputDescription variant="terminal" className="mb-3">
                    This is the structured activity payload (e.g., pull
                    requests, issues, commits, statistics) used to build the
                    markdown above. It’s suitable for programmatic inspection,
                    debugging, or export.
                  </InputDescription>
                  <div className="h-px w-full bg-border/60 mb-3" />
                  <pre className="text-sm p-0 overflow-x-auto leading-relaxed">
                    {JSON.stringify(json, null, 2)}
                  </pre>
                </TabsContent>
              ) : null}
            </Tabs>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
