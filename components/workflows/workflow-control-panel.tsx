"use client";

import Link from "next/link";
import { useState } from "react";
import { PlayCircle, Power, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WorkflowListItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  stepCount: number;
};

type WorkflowControlPanelProps = {
  initialWorkflows: WorkflowListItem[];
};

export function WorkflowControlPanel({
  initialWorkflows,
}: WorkflowControlPanelProps) {
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [busyWorkflowId, setBusyWorkflowId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateWorkflow = (updated: WorkflowListItem) => {
    setWorkflows((previous) =>
      previous.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const removeWorkflow = (workflowId: string) => {
    setWorkflows((previous) =>
      previous.filter((item) => item.id !== workflowId),
    );
  };

  const handleToggle = async (workflow: WorkflowListItem) => {
    setBusyWorkflowId(workflow.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !workflow.isActive }),
      });
      const data = (await response.json()) as {
        error?: string;
        workflow?: {
          id: string;
          name: string;
          description: string | null;
          isActive: boolean;
        };
      };

      if (!response.ok || !data.workflow) {
        setError(data.error ?? "Could not update workflow.");
        return;
      }

      updateWorkflow({
        ...workflow,
        isActive: data.workflow.isActive,
      });
      setMessage(
        data.workflow.isActive ? "Workflow activated." : "Workflow paused.",
      );
    } catch {
      setError("Network error while updating workflow.");
    } finally {
      setBusyWorkflowId(null);
    }
  };

  const handleRunTest = async (workflow: WorkflowListItem) => {
    setBusyWorkflowId(workflow.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/test`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        status?: string;
        queued?: boolean;
        execution?: {
          id: string;
          status: string;
          createdAt: string;
        };
      };

      if (!response.ok || !data.execution) {
        setError(data.error ?? "Could not run test.");
        return;
      }

      setMessage(
        data.queued
          ? "Test queued. Worker will process it shortly; check dashboard logs for final result."
          : `Test started with status ${data.execution.status}. Check dashboard logs for updates.`,
      );
    } catch {
      setError("Network error while running workflow test.");
    } finally {
      setBusyWorkflowId(null);
    }
  };

  const handleDelete = async (workflowId: string) => {
    setBusyWorkflowId(workflowId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not delete workflow.");
        return;
      }

      removeWorkflow(workflowId);
      setMessage("Workflow deleted.");
    } catch {
      setError("Network error while deleting workflow.");
    } finally {
      setBusyWorkflowId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {message ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4 text-sm text-success">
            {message}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-error/30 bg-error/5">
          <CardContent className="p-4 text-sm text-error">{error}</CardContent>
        </Card>
      ) : null}

      {workflows.length > 0 ? (
        <div className="flex flex-col gap-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>{workflow.name}</CardTitle>
                    <CardDescription>
                      Trigger: {workflow.triggerType} | Steps:{" "}
                      {workflow.stepCount}
                    </CardDescription>
                  </div>
                  <Badge variant={workflow.isActive ? "default" : "secondary"}>
                    {workflow.isActive ? "LIVE" : "PAUSED"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {workflow.description ? (
                  <p className="text-sm text-muted-foreground">
                    {workflow.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunTest(workflow)}
                    disabled={busyWorkflowId === workflow.id}
                  >
                    <PlayCircle className="mr-2 size-4" />
                    Run Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(workflow)}
                    disabled={busyWorkflowId === workflow.id}
                  >
                    <Power className="mr-2 size-4" />
                    {workflow.isActive ? "Pause" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(workflow.id)}
                    disabled={busyWorkflowId === workflow.id}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/workflows/new">Open Builder</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No workflows yet</CardTitle>
            <CardDescription>
              Create your first workflow and start testing triggers and action
              execution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/workflows/new">Create New Workflow</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
