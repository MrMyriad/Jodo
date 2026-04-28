"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type BuilderNodeData = {
  label: string;
  nodeType: "trigger" | "action";
  triggerType?: string;
  actionType?: string;
  config?: Record<string, unknown>;
};

export default function WorkflowBuilderPage() {
  const params = useParams();
  const workflowId = params?.id as string | undefined;
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] =
    useState<Node<BuilderNodeData> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showPayloadEditor, setShowPayloadEditor] = useState(false);
  const [payloadText, setPayloadText] = useState<string>("");
  const [polling, setPolling] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const nodeIdCounter = useRef(0);

  useEffect(() => {
    if (!workflowId) return;
    setLoading(true);
    setMessage(null);
    fetch(`/api/workflows/${workflowId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.workflow) {
          setError("Unable to load workflow.");
          return;
        }

        const wf = data.workflow;
        const loadedNodes: Node<BuilderNodeData>[] = [];
        const loadedEdges: Edge[] = [];

        // Trigger node
        loadedNodes.push({
          id: "trigger",
          position: { x: 250, y: 0 },
          data: {
            label: (wf.trigger && (wf.trigger as any).type) || "Trigger",
            nodeType: "trigger",
            triggerType: wf.trigger?.type ?? "",
            config: wf.trigger?.config ?? {},
          } as BuilderNodeData,
        });

        const steps = Array.isArray(wf.steps) ? wf.steps : [];
        steps.forEach((step: any, idx: number) => {
          const id = `step-${idx}`;
          loadedNodes.push({
            id,
            position: { x: 250, y: 120 * (idx + 1) },
            data: {
              label: step.type || "Action",
              nodeType: "action",
              actionType: step.type,
              config: step.config ?? {},
            } as BuilderNodeData,
          });

          const source = idx === 0 ? "trigger" : `step-${idx - 1}`;
          loadedEdges.push({
            id: `e-${source}-${id}`,
            source,
            target: id,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        });

        setNodes(loadedNodes as any);
        setEdges(loadedEdges as any);
        setIsActive(Boolean(wf.isActive));
      })
      .catch(() => setError("Failed to load workflow."))
      .finally(() => setLoading(false));
  }, [workflowId, setEdges, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const handleAddAction = (actionType = "whatsapp_send") => {
    const y = nodes.length
      ? Math.max(...nodes.map((n) => n.position?.y ?? 0)) + 140
      : 160;
    const id = `step-${Date.now().toString(36)}`;
    const newNode: Node<BuilderNodeData> = {
      id,
      position: { x: 250, y },
      data: {
        label: actionType,
        nodeType: "action",
        actionType,
        config:
          actionType === "whatsapp_send"
            ? { message: "Hi {{customer_name}}, your payment is received." }
            : {},
      },
    };

    setNodes((nds) => [...nds, newNode] as any);

    // connect last node to new node
    const lastActionNode = nodes
      .slice()
      .reverse()
      .find((n) => n.data.nodeType === "action");
    const sourceId = lastActionNode ? lastActionNode.id : "trigger";
    setEdges(
      (eds) =>
        [
          ...eds,
          {
            id: `e-${sourceId}-${id}`,
            source: sourceId,
            target: id,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
        ] as any,
    );
  };

  function getNewNodeId(prefix = "node") {
    nodeIdCounter.current += 1;
    return `${prefix}-${Date.now().toString(36)}-${nodeIdCounter.current}`;
  }

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!reactFlowWrapper.current || !reactFlowInstance) return;
    const type = event.dataTransfer.getData("application/reactflow");
    if (!type) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    const id = getNewNodeId(type);
    const newNode: Node<BuilderNodeData> = {
      id,
      position,
      data: {
        label: type,
        nodeType: "action",
        actionType: type,
        config:
          type === "whatsapp_send"
            ? { message: "Hi {{customer_name}}, your payment is received." }
            : {},
      },
    };

    setNodes((nds) => nds.concat(newNode) as any);
    // connect from last action or trigger
    const lastActionNode = nodes
      .slice()
      .reverse()
      .find((n) => n.data.nodeType === "action");
    const sourceId = lastActionNode ? lastActionNode.id : "trigger";
    setEdges((eds) =>
      eds.concat({
        id: `e-${sourceId}-${id}`,
        source: sourceId,
        target: id,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      } as any),
    );
  };

  const handleNodeClick = (_event: any, node: Node<BuilderNodeData>) => {
    setSelectedNode(node);
  };

  const updateSelectedNode = (patch: Partial<BuilderNodeData>) => {
    if (!selectedNode) return;
    setNodes(
      (nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: { ...n.data, ...patch } }
            : n,
        ) as any,
    );
    setSelectedNode((prev) =>
      prev ? { ...prev, data: { ...prev.data, ...patch } } : prev,
    );
  };

  function buildOrderedActionIds(
    nodesList: Node<BuilderNodeData>[],
    edgesList: Edge[],
  ) {
    const adjacency = new Map<string, string[]>();
    for (const e of edgesList) {
      if (!e.source || !e.target) continue;
      adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
    }

    const ordered: string[] = [];
    let current = "trigger";
    const visited = new Set<string>();

    while (true) {
      const nexts = adjacency.get(current) ?? [];
      if (!nexts || nexts.length === 0) break;
      const next = nexts[0];
      if (visited.has(next)) break;
      visited.add(next);
      ordered.push(next);
      current = next;
    }

    return ordered;
  }

  const handleSave = async () => {
    if (!workflowId) return;
    setMessage(null);
    setError(null);
    const triggerNode = nodes.find((n) => n.data.nodeType === "trigger");
    const orderedIds = buildOrderedActionIds(nodes, edges);
    const actionNodesInOrder = orderedIds
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean) as Node<BuilderNodeData>[];

    const trigger = triggerNode
      ? {
          type: triggerNode.data.triggerType ?? String(triggerNode.data.label),
          config: triggerNode.data.config ?? {},
        }
      : { type: "webhook_form_submission", config: {} };

    const steps = actionNodesInOrder.map((n) => ({
      type: n.data.actionType ?? (n.data.label as string),
      config: n.data.config ?? {},
    }));

    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger, steps }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save workflow.");
        return;
      }

      setMessage("Workflow saved.");
    } catch (err) {
      setError("Network error while saving workflow.");
    }
  };

  const handleToggleActive = async (activate: boolean) => {
    if (!workflowId) return;
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: activate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update workflow state.");
        return;
      }
      setIsActive(Boolean(data.workflow?.isActive));
      setMessage(activate ? "Workflow activated." : "Workflow deactivated.");
    } catch {
      setError("Network error while toggling active state.");
    }
  };

  const handleTest = async (payload?: Record<string, unknown>) => {
    if (!workflowId) return;
    setTesting(true);
    setTestResult(null);
    setError(null);
    setMessage(null);
    setTestError(null);

    // Save before running
    await handleSave();

    // Ensure active
    if (!isActive) {
      await handleToggleActive(true);
    }

    let payloadToSend = payload;
    if (!payloadToSend && showPayloadEditor && payloadText.trim()) {
      try {
        payloadToSend = JSON.parse(payloadText.trim());
      } catch (err) {
        setTestError("Invalid JSON payload");
        setTesting(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/workflows/${workflowId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payloadToSend ? JSON.stringify(payloadToSend) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start test.");
        setTesting(false);
        return;
      }

      // initial result contains execution metadata
      setTestResult(data.execution ?? data);
      setMessage(data.status === "queued" ? "Test queued." : "Test started.");

      const executionId = data.execution?.id;
      if (executionId) {
        setPolling(true);
        // poll for execution updates (up to ~60s)
        for (let i = 0; i < 60; i++) {
          try {
            const r = await fetch(`/api/executions/${executionId}`);
            if (!r.ok) break;
            const j = await r.json();
            if (j.execution) {
              setTestResult(j.execution);
              const s = String(j.execution.status ?? "").toUpperCase();
              if (s !== "RUNNING" && s !== "PENDING") {
                break;
              }
            }
          } catch (err) {
            // ignore and retry
          }
          await new Promise((res) => setTimeout(res, 1000));
        }
        setPolling(false);
      }
    } catch {
      setError("Network error while starting test.");
    } finally {
      setTesting(false);
    }
  };

  const selectedData = selectedNode?.data;

  return (
    <div className="flex h-screen w-full">
      <div className="w-56 border-r bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-medium">Palette</h3>
        <div className="flex flex-col gap-2">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, "whatsapp_send")}
            className="cursor-grab rounded-md border bg-white p-3 text-sm"
          >
            Send WhatsApp
          </div>
          <div
            draggable
            onDragStart={(e) => onDragStart(e, "zoho_create_invoice")}
            className="cursor-grab rounded-md border bg-white p-3 text-sm"
          >
            Create Zoho Invoice
          </div>
          <div
            draggable
            onDragStart={(e) => onDragStart(e, "sheets_append")}
            className="cursor-grab rounded-md border bg-white p-3 text-sm"
          >
            Append to Google Sheet
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Visual Workflow Builder</h2>
            <p className="text-sm text-muted-foreground">
              Edit nodes and connections
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => handleAddAction("whatsapp_send")}>
              + Add WhatsApp
            </Button>
            <Button onClick={() => handleAddAction("zoho_create_invoice")}>
              + Add Invoice
            </Button>
            <Button
              onClick={() => handleAddAction("sheets_append")}
              variant="outline"
            >
              + Add Sheet
            </Button>
            <Button onClick={handleSave} className="ml-2">
              Save
            </Button>
            <Button
              onClick={() => handleTest()}
              className="ml-2"
              variant="outline"
              disabled={testing}
            >
              {testing ? "Testing..." : "Test Workflow"}
            </Button>
            <Button
              onClick={() => handleToggleActive(!isActive)}
              className="ml-2"
              variant="outline"
            >
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>

        <div className="h-[calc(100vh-84px)]">
          <ReactFlowProvider>
            <div
              ref={reactFlowWrapper}
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="h-full"
            >
              <ReactFlow
                nodes={nodes as any}
                edges={edges as any}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                fitView
                onInit={(instance) => setReactFlowInstance(instance)}
              >
                <Background />
                <MiniMap />
                <Controls />
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        </div>
      </div>

      <aside className="w-96 border-l bg-slate-50">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Node Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedData ? (
              <div className="flex flex-col gap-3">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={String(selectedData.label)}
                    onChange={(e) =>
                      updateSelectedNode({ label: e.target.value })
                    }
                  />
                </div>

                {selectedData.nodeType === "trigger" ? (
                  <div>
                    <Label>Trigger Type</Label>
                    <Input
                      value={selectedData.triggerType ?? ""}
                      onChange={(e) =>
                        updateSelectedNode({ triggerType: e.target.value })
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Action Type</Label>
                      <select
                        className="w-full rounded-md border p-2"
                        value={selectedData.actionType ?? ""}
                        onChange={(e) =>
                          updateSelectedNode({ actionType: e.target.value })
                        }
                      >
                        <option value="">-- select --</option>
                        <option value="whatsapp_send">Send WhatsApp</option>
                        <option value="zoho_create_invoice">
                          Create Zoho Invoice
                        </option>
                        <option value="sheets_append">
                          Append to Google Sheet
                        </option>
                      </select>
                    </div>

                    {selectedData.actionType === "whatsapp_send" ||
                    (!selectedData.actionType &&
                      selectedData.label.includes("whatsapp")) ? (
                      <div>
                        <Label>Message Template</Label>
                        <Textarea
                          value={String(selectedData.config?.message ?? "")}
                          onChange={(e) =>
                            updateSelectedNode({
                              config: {
                                ...(selectedData.config ?? {}),
                                message: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    ) : null}

                    {selectedData.actionType === "sheets_append" ? (
                      <>
                        <div>
                          <Label>Sheet Name</Label>
                          <Input
                            value={String(
                              selectedData.config?.sheetName ?? "Sheet1",
                            )}
                            onChange={(e) =>
                              updateSelectedNode({
                                config: {
                                  ...(selectedData.config ?? {}),
                                  sheetName: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Columns (comma separated)</Label>
                          <Input
                            value={String(selectedData.config?.columns ?? "")}
                            onChange={(e) =>
                              updateSelectedNode({
                                config: {
                                  ...(selectedData.config ?? {}),
                                  columns: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </>
                    ) : null}

                    {selectedData.actionType === "zoho_create_invoice" ? (
                      <>
                        <div>
                          <Label>Customer Name</Label>
                          <Input
                            value={String(
                              selectedData.config?.customerName ??
                                "{{customer.name}}",
                            )}
                            onChange={(e) =>
                              updateSelectedNode({
                                config: {
                                  ...(selectedData.config ?? {}),
                                  customerName: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </>
                    ) : null}
                  </>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      if (selectedNode) {
                        setNodes(
                          (nds) =>
                            nds.filter((n) => n.id !== selectedNode.id) as any,
                        );
                        setSelectedNode(null);
                      }
                    }}
                    variant="destructive"
                  >
                    Delete Node
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a node to edit its properties.
              </p>
            )}

            <div className="mt-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowPayloadEditor((s) => !s)}>
                  {showPayloadEditor ? "Hide payload" : "Edit payload"}
                </Button>
                <Button onClick={() => handleTest(undefined)} disabled={testing}>
                  {testing ? "Testing..." : "Run Test"}
                </Button>
              </div>

              {showPayloadEditor ? (
                <div className="mt-2">
                  <Label>Payload (JSON)</Label>
                  <Textarea value={payloadText} onChange={(e) => setPayloadText(e.target.value)} rows={6} />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use a sample payload.</p>
                </div>
              ) : null}

              {testError ? <p className="mt-2 text-red-600">{testError}</p> : null}
              {loading ? <p>Loading...</p> : null}
              {message ? <p className="text-green-600">{message}</p> : null}
              {error ? <p className="text-red-600">{error}</p> : null}

              {testResult ? (
                <div className="rounded-md border bg-muted/40 p-3 mt-3">
                  <p className="text-xs font-medium">
                    Execution: {testResult.id} —{' '}
                    <span className="font-semibold">{String(testResult.status ?? "")}</span>
                  </p>

                  {/* Execution error */}
                  {testResult.error ? (
                    <p className="mt-2 text-sm text-red-600">Error: {String(testResult.error)}</p>
                  ) : null}

                  {/* Compute workflow steps from execution.workflow or local nodes */}
                  {(() => {
                    const completed = Array.isArray(testResult.stepResults)
                      ? testResult.stepResults.length
                      : 0;

                    // derive steps: prefer execution.workflow.steps (from server), fallback to local nodes
                    const wfSteps: Array<any> =
                      (testResult.workflow && Array.isArray(testResult.workflow.steps)
                        ? testResult.workflow.steps
                        : buildOrderedActionIds(nodes, edges).map((id) => {
                            const n = nodes.find((x) => x.id === id);
                            return n ? { type: n.data.actionType ?? String(n.data.label), config: n.data.config } : { type: `step_${id}` };
                          })) ?? [];

                    return (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">Progress</div>
                          <div className="text-xs">{completed}/{wfSteps.length} steps</div>
                        </div>

                        <div className="space-y-2 mt-2">
                          {wfSteps.map((step: any, idx: number) => {
                            const done = idx < completed;
                            const inProgress = idx === completed && String(testResult.status).toUpperCase() === "RUNNING";
                            const stepResult = (testResult.stepResults && testResult.stepResults[idx]) || null;

                            return (
                              <div key={idx} className="flex gap-3 items-start rounded-md border bg-white p-3">
                                <div className="w-8 flex items-center justify-center text-sm font-medium">
                                  {done ? '✓' : inProgress ? '●' : idx + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium">{step.type ?? step.actionType ?? `Step ${idx + 1}`}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {done ? 'Completed' : inProgress ? 'In progress' : 'Pending'}
                                    </div>
                                  </div>

                                  <div className="mt-2 text-xs text-muted-foreground">
                                    {stepResult ? (
                                      <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(stepResult.result ?? stepResult, null, 2)}</pre>
                                    ) : (
                                      <div className="text-xs">No output yet.</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <a className="text-sm underline" href={`/dashboard/executions/${testResult.id}`}>
                            Open in dashboard
                          </a>
                          <button
                            className="text-sm underline"
                            onClick={() => {
                              try {
                                navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
                                setMessage('Execution JSON copied to clipboard.');
                              } catch (e) {
                                setError('Failed to copy logs.');
                              }
                            }}
                          >
                            Copy logs
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
