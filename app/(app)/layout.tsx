import { SiteHeader } from "@/components/site-header";
import { ListingsProvider } from "@/hooks/use-listings";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ListingsProvider>
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </div>
    </ListingsProvider>
  );
}
