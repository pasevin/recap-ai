import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Recap AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered professional activity aggregation platform that helps
            knowledge workers generate comprehensive summaries of their work
            across multiple productivity platforms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Aggregate your GitHub activity and commits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Connect GitHub</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linear Integration</CardTitle>
              <CardDescription>
                Track your Linear issues and project progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Connect Linear</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Summaries</CardTitle>
              <CardDescription>
                Generate intelligent summaries of your work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Generate Summary</Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">API Endpoints</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <code className="text-sm">/api/summarize</code>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <code className="text-sm">/api/github</code>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <code className="text-sm">/api/linear</code>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <code className="text-sm">/api/config</code>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
