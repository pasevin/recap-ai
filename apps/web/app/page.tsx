import { MainLayout } from '@/components/layout/main-layout';
import { SummaryCard } from '@/components/dashboard/summary-card';

export default function Home() {
  return (
    <MainLayout>
      <SummaryCard />
    </MainLayout>
  );
}
