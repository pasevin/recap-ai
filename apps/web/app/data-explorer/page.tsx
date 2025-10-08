import { MainLayout } from '@/components/layout/main-layout';
import { DataSourcesTab } from '@/components/dashboard/data-sources-tab';

export default function DataExplorerPage() {
  return (
    <MainLayout>
      <DataSourcesTab />
    </MainLayout>
  );
}
