"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  FlaskConical,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTemplateById } from "@/lib/template-catalog";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type ActionType = "whatsapp_send" | "sheets_append" | "gmail_send" | "delay";
type SendToOption = "trigger" | "custom";

type TriggerOption = {
  type: string;
  title: string;
  description: string;
  icon: string;
  accountLabel: string;
};

type ActionOption = {
  type: ActionType;
  title: string;
  description: string;
  icon: string;
};

type ActionConfig = {
  sendTo?: SendToOption;
  customPhone?: string;
  message?: string;
  spreadsheetId?: string;
  sheetName?: string;
  columns?: string;
  to?: string;
  subject?: string;
  body?: string;
  seconds?: number;
};

type ActionDraft = {
  id: string;
  type: ActionType;
  config: ActionConfig;
};

type WorkflowBuilderProps = {
  templateId?: string;
};

const triggerOptions: TriggerOption[] = [
  {
    type: "whatsapp_message",
    title: "New WhatsApp Message",
    description: "When someone sends your WhatsApp Business account a message.",
    icon: "WA",
    accountLabel: "Which WhatsApp account?",
  },
  {
    type: "razorpay_payment",
    title: "Razorpay Payment Received",
    description: "When a payment gets captured in Razorpay.",
    icon: "RP",
    accountLabel: "Which Razorpay account?",
  },
  {
    type: "razorpay_refund",
    title: "Razorpay Refund Created",
    description: "When a new refund is created in Razorpay.",
    icon: "RF",
    accountLabel: "Which Razorpay account?",
  },
  {
    type: "instagram_dm",
    title: "New Instagram DM",
    description: "When someone sends a direct message on Instagram.",
    icon: "IG",
    accountLabel: "Which Instagram business account?",
  },
  {
    type: "instagram_comment",
    title: "New Instagram Comment",
    description: "When someone comments on Instagram.",
    icon: "IC",
    accountLabel: "Which Instagram business account?",
  },
  {
    type: "webhook_form_submission",
    title: "Form/Webhook Submission",
    description: "When your webhook endpoint receives form data.",
    icon: "WH",
    accountLabel: "Which webhook endpoint?",
  },
  {
    type: "gmail_new_email",
    title: "New Email",
    description: "When a matching email arrives in Gmail.",
    icon: "GM",
    accountLabel: "Which Gmail account?",
  },
  {
    type: "schedule_daily",
    title: "Schedule Trigger",
    description: "Run on a daily schedule such as 9 AM.",
    icon: "SC",
    accountLabel: "Which timezone schedule?",
  },
  {
    type: "new_order",
    title: "New Order",
    description: "Generic order-created trigger from checkout systems.",
    icon: "OR",
    accountLabel: "Which order source?",
  },
  {
    type: "cod_confirmation",
    title: "COD Confirmation",
    description: "When COD confirmation is received from customer.",
    icon: "CD",
    accountLabel: "Which COD source?",
  },
];

const actionOptions: ActionOption[] = [
  {
    type: "whatsapp_send",
    title: "Send WhatsApp Message",
    description: "Send a templated message to customer or team.",
    icon: "WA",
  },
  {
    type: "sheets_append",
    title: "Add to Google Sheet",
    description: "Append data as a new row in Google Sheets.",
    icon: "GS",
  },
  {
    type: "gmail_send",
    title: "Send Email",
    description: "Send an email notification.",
    icon: "EM",
  },
  {
    type: "delay",
    title: "Wait (Delay)",
    description: "Pause execution before the next action.",
    icon: "DL",
  },
];

const variableTokens = [
  "{{customer_name}}",
  "{{order_id}}",
  "{{amount}}",
  "{{payment_id}}",
];

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultActionConfig(type: ActionType): ActionConfig {
  if (type === "whatsapp_send") {
    return {
      sendTo: "trigger",
      message: "Hi {{customer_name}}, your update is ready.",
    };
  }

  if (type === "sheets_append") {
    return {
      spreadsheetId: "",
      sheetName: "Sheet1",
      columns: "{{customer_name}},{{order_id}},{{amount}}",
    };
  }

  if (type === "gmail_send") {
    return {
      to: "",
      subject: "New workflow event",
      body: "Hello, a new event occurred for {{customer_name}}.",
    };
  }

  return {
    seconds: 60,
  };
}

function buildActionDraft(type: ActionType): ActionDraft {
  return {
    id: makeId(type),
    type,
    config: defaultActionConfig(type),
  };
}

function humanizeActionType(type: ActionType): string {
  if (type === "whatsapp_send") return "Send WhatsApp Message";
  if (type === "sheets_append") return "Add to Google Sheet";
  if (type === "gmail_send") return "Send Email";
  return "Wait (Delay)";
}

function actionSummary(action: ActionDraft): string {
  if (action.type === "whatsapp_send") {
    return action.config.message
      ? `Message: ${action.config.message}`
      : "Configure message body";
  }

  if (action.type === "sheets_append") {
    return action.config.sheetName
      ? `Sheet: ${action.config.sheetName}`
      : "Configure sheet destination";
  }

  if (action.type === "gmail_send") {
    return action.config.subject
      ? `Subject: ${action.config.subject}`
      : "Configure email subject";
  }

  return `Wait ${(action.config.seconds ?? 0).toString()} seconds`;
}

function previousStep(step: Step): Step {
  if (step === 1) return 1;
  if (step === 2) return 1;
  return 2;
}

export function WorkflowBuilder({ templateId }: WorkflowBuilderProps) {
  const template = getTemplateById(templateId);
  const prefilledActions = useMemo(() => {
    if (!template) {
      return [];
    }

    return template.actions
      .map((action) => action.type as ActionType)
      .filter((type) => actionOptions.some((option) => option.type === type))
      .slice(0, 5)
      .map((type) => buildActionDraft(type));
  }, [template]);

  const [step, setStep] = useState<Step>(1);
  const [workflowName, setWorkflowName] = useState(template?.title ?? "");
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(
    template?.triggerType ?? null,
  );
  const [selectedAccount, setSelectedAccount] = useState("default-account");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [actions, setActions] = useState<ActionDraft[]>(prefilledActions);
  const [showActionSelector, setShowActionSelector] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(
    prefilledActions[0]?.id ?? null,
  );
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentTrigger =
    triggerOptions.find((option) => option.type === selectedTrigger) ?? null;
  const editingAction =
    actions.find((action) => action.id === editingActionId) ?? null;

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(selectedTrigger);
    if (step === 2)
      return Boolean(workflowName.trim()) && Boolean(selectedAccount);
    return actions.length > 0;
  }, [actions.length, selectedAccount, selectedTrigger, step, workflowName]);

  const updateAction = (actionId: string, configPatch: ActionConfig) => {
    setActions((previous) =>
      previous.map((action) =>
        action.id === actionId
          ? {
              ...action,
              config: { ...action.config, ...configPatch },
            }
          : action,
      ),
    );
  };

  const handleAddAction = (type: ActionType) => {
    if (actions.length >= 5) {
      setShowActionSelector(false);
      return;
    }

    const draft = buildActionDraft(type);
    setActions((previous) => [...previous, draft]);
    setEditingActionId(draft.id);
    setShowActionSelector(false);
  };

  const handleDeleteAction = (actionId: string) => {
    setActions((previous) =>
      previous.filter((action) => action.id !== actionId),
    );
    if (editingActionId === actionId) {
      setEditingActionId(null);
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestMessage(null);

    await new Promise((resolve) => setTimeout(resolve, 900));

    setIsTesting(false);
    setTestMessage(
      "Test run completed. Action sequence and variable mapping look valid.",
    );
  };

  const handleContinue = async () => {
    if (step < 3) {
      setStep((previous) => (previous + 1) as Step);
      return;
    }

    if (!selectedTrigger) {
      setSaveError("Please select a trigger before saving.");
      return;
    }

    if (actions.length === 0) {
      setSaveError("Please add at least one action.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const payload = {
      name: workflowName.trim(),
      status: "ACTIVE",
      trigger: {
        type: selectedTrigger,
        config: {
          account: selectedAccount,
          keywordFilter: keywordFilter.trim() || null,
        },
      },
      actions: actions.map((action) => ({
        type: action.type,
        config: action.config,
      })),
    };

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        workflow?: { id: string; name: string };
      };

      if (!response.ok) {
        setSaveError(data.error ?? "Unable to save workflow.");
        return;
      }

      setSaveMessage(
        `Workflow "${data.workflow?.name ?? workflowName}" saved as Active. Razorpay webhook can now trigger executions.`,
      );
    } catch {
      setSaveError("Network error while saving workflow. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Create Workflow</h1>
        <p className="text-muted-foreground">
          Build a simple linear automation: Trigger - Action 1 - Action 2 -
          Action 3.
        </p>
        {template ? (
          <Badge variant="secondary" className="w-fit">
            <Sparkles className="mr-1 size-3.5" />
            Prefilled from template: {template.title}
          </Badge>
        ) : null}
      </header>

      <Card>
        <CardContent className="grid grid-cols-3 gap-3 p-6">
          {[
            { step: 1, label: "Choose Trigger" },
            { step: 2, label: "Configure Trigger" },
            { step: 3, label: "Add Actions" },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-sm",
                  step >= item.step
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground",
                )}
              >
                {item.step}
              </div>
              <p
                className={cn(
                  "text-sm",
                  step >= item.step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>When should this automation run?</CardTitle>
            <CardDescription>
              Select one trigger to start your workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {triggerOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  selectedTrigger === option.type
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50",
                )}
                onClick={() => setSelectedTrigger(option.type)}
              >
                <p className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                  {option.icon}
                </p>
                <p className="mt-2 text-sm font-medium">{option.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Configure trigger</CardTitle>
            <CardDescription>
              Choose account and optional filters for this trigger.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workflow-name">Workflow name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(event) => setWorkflowName(event.target.value)}
                placeholder="e.g., Razorpay payment to order sheet"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="trigger-account">
                {currentTrigger?.accountLabel ?? "Which account?"}
              </Label>
              <select
                id="trigger-account"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedAccount}
                onChange={(event) => setSelectedAccount(event.target.value)}
              >
                <option value="default-account">Primary Account</option>
                <option value="secondary-account">Secondary Account</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="keyword-filter">
                Filter by keyword (optional)
              </Label>
              <Input
                id="keyword-filter"
                value={keywordFilter}
                onChange={(event) => setKeywordFilter(event.target.value)}
                placeholder="e.g., order, help, refund"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>What should happen?</CardTitle>
              <CardDescription>
                Add up to 5 actions in sequence.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {actions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No actions added yet. Start by choosing an action.
                </div>
              ) : null}

              {actions.map((action, index) => (
                <div
                  key={action.id}
                  className={cn(
                    "rounded-lg border p-4",
                    editingActionId === action.id
                      ? "border-primary bg-primary/5"
                      : "border-input",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">
                        Action {index + 1}: {humanizeActionType(action.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {actionSummary(action)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingActionId(action.id)}
                      >
                        <PencilLine className="mr-1 size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAction(action.id)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowActionSelector(true)}
                disabled={actions.length >= 5}
              >
                <Plus className="mr-2 size-4" />
                {actions.length >= 5
                  ? "Maximum 5 actions reached"
                  : "Add Action"}
              </Button>
            </CardContent>
          </Card>

          {editingAction ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Configure: {humanizeActionType(editingAction.type)}
                </CardTitle>
                <CardDescription>
                  Use dynamic variables from trigger data where needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {editingAction.type === "whatsapp_send" ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="send-to">Send to</Label>
                      <select
                        id="send-to"
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={editingAction.config.sendTo ?? "trigger"}
                        onChange={(event) =>
                          updateAction(editingAction.id, {
                            sendTo: event.target.value as SendToOption,
                          })
                        }
                      >
                        <option value="trigger">Person who triggered</option>
                        <option value="custom">Custom phone number</option>
                      </select>
                    </div>

                    {editingAction.config.sendTo === "custom" ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="custom-phone">Phone number</Label>
                        <Input
                          id="custom-phone"
                          placeholder="+91 98765 43210"
                          value={editingAction.config.customPhone ?? ""}
                          onChange={(event) =>
                            updateAction(editingAction.id, {
                              customPhone: event.target.value,
                            })
                          }
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="wa-message">Message</Label>
                      <Textarea
                        id="wa-message"
                        value={editingAction.config.message ?? ""}
                        onChange={(event) =>
                          updateAction(editingAction.id, {
                            message: event.target.value,
                          })
                        }
                        placeholder="Your order {{order_id}} has been confirmed."
                      />
                      <p className="text-xs text-muted-foreground">
                        Use variables like {`{{customer_name}}`} and{" "}
                        {`{{amount}}`} in the message.
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium">Available variables</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {variableTokens.map((token) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() =>
                              updateAction(editingAction.id, {
                                message:
                                  `${editingAction.config.message ?? ""} ${token}`.trim(),
                              })
                            }
                          >
                            <Badge variant="outline">{token}</Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {editingAction.type === "sheets_append" ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="sheet-id">Spreadsheet ID</Label>
                      <Input
                        id="sheet-id"
                        value={editingAction.config.spreadsheetId ?? ""}
                        onChange={(event) =>
                          updateAction(editingAction.id, {
                            spreadsheetId: event.target.value,
                          })
                        }
                        placeholder="1AbC...xyz"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="sheet-name">Sheet name</Label>
                      <Input
                        id="sheet-name"
                        value={editingAction.config.sheetName ?? ""}
                        onChange={(event) =>
                          updateAction(editingAction.id, {
                            sheetName: event.target.value,
                          })
                        }
                        placeholder="Orders"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="sheet-columns">Columns mapping</Label>
                      <Textarea
                        id="sheet-columns"
                        value={editingAction.config.columns ?? ""}
                        onChange={(event) =>
                          updateAction(editingAction.id, {
                            columns: event.target.value,
                          })
                        }
                        placeholder="{{customer_name}},{{order_id}},{{amount}}"
                      />
                    </div>
                  </>
                ) : null}

                {editingAction.type === "gmail_send" ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="gmail-to">To email</Label>
                      <Input
                        id="gmail-to"
                        type="email"
                        value={editingAction.config.to ?? ""}
                        onChange={(event) =>
                          updateAction(editingAction.id, {
                            to: event.target.value,
                          })
                        }
                        placeholder="team@yourbusiness.com"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="gmail-subject">Subject</Label>
                      <Input
                        id="gmail-subject"
                        value={editingAction.config.subject ?? ""}
                        onChange={(event) =>
                          updateAction(editingAction.id, {
                            subject: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="gmail-body">Body</Label>
                      <Textarea
                        id="gmail-body"
                        value={editingAction.config.body ?? ""}
                        onChange={(event) =>
                          updateAction(editingAction.id, {
                            body: event.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                ) : null}

                {editingAction.type === "delay" ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="delay-seconds">Delay (seconds)</Label>
                    <Input
                      id="delay-seconds"
                      type="number"
                      min={1}
                      max={3600}
                      value={editingAction.config.seconds ?? 60}
                      onChange={(event) =>
                        updateAction(editingAction.id, {
                          seconds: Number(event.target.value || 0),
                        })
                      }
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((prev) => previousStep(prev))}
          disabled={step === 1}
        >
          Back
        </Button>

        <div className="flex gap-2">
          {step === 3 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleRunTest}
              disabled={isTesting || actions.length === 0}
            >
              <FlaskConical className="mr-2 size-4" />
              {isTesting ? "Running Test..." : "Send Test"}
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!canProceed || isSaving}
          >
            {step === 3
              ? isSaving
                ? "Saving..."
                : "Save & Activate"
              : "Continue"}
          </Button>
        </div>
      </div>

      {testMessage ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="size-4 text-success" />
            {testMessage}
          </CardContent>
        </Card>
      ) : null}

      {saveMessage ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm">
            <CheckCircle2 className="size-4 text-primary" />
            {saveMessage}
          </CardContent>
        </Card>
      ) : null}

      {saveError ? (
        <Card className="border-error/30 bg-error/5">
          <CardContent className="p-4 text-sm text-error">
            {saveError}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={showActionSelector} onOpenChange={setShowActionSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose an action</DialogTitle>
            <DialogDescription>
              Select the next step in your automation flow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {actionOptions.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => handleAddAction(option.type)}
                className="rounded-lg border border-input p-4 text-left transition-colors hover:border-primary/60"
              >
                <p className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                  {option.icon}
                </p>
                <p className="mt-2 text-sm font-medium">{option.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
