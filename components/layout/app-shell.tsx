import { SidebarNav } from "@/components/layout/sidebar-nav";

type AppShellProps = {
  user: {
    name: string | null | undefined;
    email: string;
    plan: string;
    language: string;
  };
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex min-h-screen flex-col md:flex-row">
        <SidebarNav
          userName={user.name ?? "Business Owner"}
          userEmail={user.email}
          plan={user.plan}
          language={user.language}
        />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
