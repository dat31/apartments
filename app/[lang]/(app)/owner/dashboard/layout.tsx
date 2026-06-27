import { DashboardHeader } from "./components/dashboard-header";
import { DashboardStats } from "./components/dashboard-stats";
import { DashboardNav } from "./components/dashboard-nav";

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-5 sm:px-8 py-8">
      <DashboardHeader />
      <DashboardStats />

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 bg-sidebar p-3">
            <DashboardNav variant="sidebar" />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="lg:hidden mb-5">
            <DashboardNav variant="chips" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
