import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen paper-bg">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
