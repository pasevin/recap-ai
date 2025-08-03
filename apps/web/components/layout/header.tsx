import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Recap AI</h1>
            <nav className="hidden md:flex space-x-4">
              <Button variant="ghost">Dashboard</Button>
              <Button variant="ghost">Reports</Button>
              <Button variant="ghost">Settings</Button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline">API Docs</Button>
            <Button>Generate Report</Button>
          </div>
        </div>
      </div>
    </header>
  );
}
