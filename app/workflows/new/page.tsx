import { AppShell } from "@/components/layout/app-shell";
import { WorkflowBuilder } from "@/components/workflows/workflow-builder";
import { requireUser } from "@/lib/require-user";

type NewWorkflowPageProps = {
  searchParams?: {
    template?: string;
  };
};

export default async function NewWorkflowPage({
  searchParams,
}: NewWorkflowPageProps) {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <WorkflowBuilder templateId={searchParams?.template} />
    </AppShell>
  );
}
