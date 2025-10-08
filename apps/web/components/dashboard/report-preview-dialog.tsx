'use client';

import { useState } from 'react';
import { FileText, Download, FileImage, FileCode, Eye, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ReportData {
  title: string;
  timeRange: string;
  content: string;
  metrics?: {
    commits?: number;
    issues?: number;
    pullRequests?: number;
    linesChanged?: number;
    filesModified?: number;
    contributors?: number;
  };
  charts?: {
    commitActivity?: unknown;
    issueStatus?: unknown;
    contributorActivity?: unknown;
  };
  rawData?: unknown;
}

export interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData?: ReportData | null;
  isLoading?: boolean;
}

export function ReportPreviewDialog({
  open,
  onOpenChange,
  reportData,
  isLoading = false,
}: ReportPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState('preview');

  const handleExportMarkdown = () => {
    if (!reportData) return;

    const blob = new Blob([reportData.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!reportData) return;

    const exportData = {
      title: reportData.title,
      timeRange: reportData.timeRange,
      content: reportData.content,
      metrics: reportData.metrics,
      rawData: reportData.rawData,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!reportData) return;

    // TODO: Implement PDF export functionality
    // Consider using libraries like jsPDF or Puppeteer for PDF generation

    // For now, create an HTML version that can be printed
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportData.title}</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2, h3 { color: #333; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }
          .metric { padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; }
          pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
          code { background: #f5f5f5; padding: 2px 4px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>${reportData.title}</h1>
        <p><strong>Time Range:</strong> ${reportData.timeRange}</p>
        ${reportData.content}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title.replace(/\s+/g, '-').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Generating Report...</DialogTitle>
            <DialogDescription>
              Please wait while we generate your activity report.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary border-r-transparent" />
              <p className="text-muted-foreground">Processing your data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Report Preview
          </DialogTitle>
          <DialogDescription>
            {reportData.title} • {reportData.timeRange}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="flex-shrink-0 w-full justify-start">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Preview
              </TabsTrigger>
              {reportData.metrics && (
                <TabsTrigger
                  value="metrics"
                  className="flex items-center gap-2"
                >
                  <FileImage className="h-4 w-4" />
                  Metrics
                </TabsTrigger>
              )}
              {!!reportData.rawData && (
                <TabsTrigger value="raw" className="flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Raw Data
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex-1 min-h-0 mt-4">
              <TabsContent value="preview" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="prose prose-sm max-w-none p-4">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold text-foreground mb-4">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-foreground mb-3 leading-relaxed">
                            {children}
                          </p>
                        ),
                        code: ({ children, className }) => (
                          <code
                            className={`${className} bg-muted px-1.5 py-0.5 rounded text-sm`}
                          >
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
                            {children}
                          </pre>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-4 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-4 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-foreground">{children}</li>
                        ),
                      }}
                    >
                      {reportData.content}
                    </ReactMarkdown>
                  </div>
                </ScrollArea>
              </TabsContent>

              {reportData.metrics && (
                <TabsContent value="metrics" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {Object.entries(reportData.metrics).map(
                          ([key, value]) => (
                            <Card key={key}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">
                                  {value?.toLocaleString()}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        )}
                      </div>
                      {reportData.charts && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Charts</h3>
                          <div className="text-muted-foreground">
                            Charts and visualizations would be displayed here.
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {!!reportData.rawData && (
                <TabsContent value="raw" className="h-full m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(reportData.rawData, null, 2)}
                      </pre>
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMarkdown}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Export Markdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              className="flex items-center gap-2"
            >
              <FileCode className="h-4 w-4" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
