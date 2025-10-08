import { Header } from './header';

interface _MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: _MainLayoutProps) {
  return (
    <div className="app-shell bg-background min-h-screen flex flex-col">
      <Header />
      <main className="site-container px-4 sm:px-6 py-6 sm:py-8 flex-1 pt-16 sm:pt-20">
        {children}
      </main>
      <footer className="border-t mt-auto">
        <div className="site-container px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            © 2025 Recap AI. Built with Next.js and Tailwind CSS.
          </div>
        </div>
      </footer>
    </div>
  );
}
