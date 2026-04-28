import { SidebarNav } from "@/components/layout/sidebar-nav";

type AppShellProps = {
  user: {
    name: string | null | undefined;
    email: string;
    plan: string;
  };
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex min-h-screen">
        <SidebarNav
          userName={user.name ?? "Business Owner"}
          userEmail={user.email}
          plan={user.plan}
        />
        <main className="flex-1 px-4 py-8 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
