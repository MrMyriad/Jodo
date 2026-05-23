"use client";

import { useMemo, useState } from "react";
import { IntegrationType } from "@prisma/client";
import {
  CheckCircle2,
  FlaskConical,
  Link2,
  Loader2,
  Power,
  Trash2,
} from "lucide-react";
import { integrationCatalog } from "@/lib/integration-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

type ConnectionItem = {
  id: string;
  name: string;
  type: IntegrationType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ConnectionCenterProps = {
  initialConnections: ConnectionItem[];
};

type FormState = {
  name: string;
  phoneNumberId: string;
  accessToken: string;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  spreadsheetId: string;
  sheetName: string;
  zohoOrganizationId: string;
  instagramAccountId: string;
  exotelApiKey: string;
  exotelApiToken: string;
};

const defaultFormState: FormState = {
  name: "",
  phoneNumberId: "",
  accessToken: "",
  keyId: "",
  keySecret: "",
  webhookSecret: "",
  spreadsheetId: "",
  sheetName: "Sheet1",
  zohoOrganizationId: "",
  instagramAccountId: "",
  exotelApiKey: "",
  exotelApiToken: "",
};

const supportedConnectTypes = new Set<IntegrationType>([
  "WHATSAPP_BUSINESS",
  "RAZORPAY",
  "GOOGLE_SHEETS",
  "ZOHO_BOOKS",
  "INSTAGRAM",
  "EXOTEL",
]);

function buildCredentials(type: IntegrationType, form: FormState) {
  if (type === "WHATSAPP_BUSINESS") {
    return {
      phoneNumberId: form.phoneNumberId.trim(),
      accessToken: form.accessToken.trim(),
    };
  }

  if (type === "RAZORPAY") {
    return {
      keyId: form.keyId.trim(),
      keySecret: form.keySecret.trim(),
      webhookSecret: form.webhookSecret.trim(),
    };
  }

  if (type === "ZOHO_BOOKS") {
    return {
      accessToken: form.accessToken.trim(),
      organizationId: form.zohoOrganizationId.trim(),
    };
  }

  if (type === "INSTAGRAM") {
    return {
      accessToken: form.accessToken.trim(),
      igAccountId: form.instagramAccountId.trim(),
    };
  }

  if (type === "EXOTEL") {
    return {
      apiKey: form.exotelApiKey.trim(),
      apiToken: form.exotelApiToken.trim(),
      webhookSecret: form.webhookSecret.trim(),
    };
  }

  return {
    accessToken: form.accessToken.trim(),
    spreadsheetId: form.spreadsheetId.trim(),
    sheetName: form.sheetName.trim(),
  };
}

function defaultConnectionName(type: IntegrationType): string {
  if (type === "WHATSAPP_BUSINESS") return "Primary WhatsApp";
  if (type === "RAZORPAY") return "Primary Razorpay";
  if (type === "ZOHO_BOOKS") return "Primary Zoho Books";
  if (type === "INSTAGRAM") return "Primary Instagram";
  if (type === "EXOTEL") return "Primary Exotel";
  return "Primary Google Sheet";
}

export function ConnectionCenter({
  initialConnections,
}: ConnectionCenterProps) {
  const [connections, setConnections] =
    useState<ConnectionItem[]>(initialConnections);
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(
    null,
  );
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(
    null,
  );
  const [updatingConnectionId, setUpdatingConnectionId] = useState<
    string | null
  >(null);

  const connectionsByType = useMemo(() => {
    const map = new Map<IntegrationType, ConnectionItem[]>();
    for (const connection of connections) {
      const existing = map.get(connection.type) ?? [];
      map.set(connection.type, [...existing, connection]);
    }
    return map;
  }, [connections]);

  const openConnectDialog = (type: IntegrationType) => {
    if (!supportedConnectTypes.has(type)) {
      setGlobalError(
        "This integration setup flow will be added in upcoming slices.",
      );
      setGlobalMessage(null);
      return;
    }

    setSelectedType(type);
    setFormState((previous) => ({
      ...defaultFormState,
      name: previous.name || defaultConnectionName(type),
      sheetName: "Sheet1",
    }));
    setGlobalError(null);
    setGlobalMessage(null);
  };

  const closeConnectDialog = () => {
    setSelectedType(null);
  };

  const patchConnectionInState = (updated: ConnectionItem) => {
    setConnections((previous) => {
      const exists = previous.some((item) => item.id === updated.id);
      if (exists) {
        return previous.map((item) =>
          item.id === updated.id ? updated : item,
        );
      }

      return [updated, ...previous];
    });
  };

  const removeConnectionFromState = (connectionId: string) => {
    setConnections((previous) =>
      previous.filter((item) => item.id !== connectionId),
    );
  };

  const handleSaveConnection = async () => {
    if (!selectedType) {
      return;
    }

    setIsSaving(true);
    setGlobalError(null);
    setGlobalMessage(null);

    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          name: formState.name.trim() || defaultConnectionName(selectedType),
          credentials: buildCredentials(selectedType, formState),
          testBeforeSave: true,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        connection?: ConnectionItem;
      };

      if (!response.ok || !data.connection) {
        setGlobalError(data.error ?? "Could not save connection.");
        return;
      }

      patchConnectionInState(data.connection);
      setGlobalMessage("Connection saved and verified successfully.");
      closeConnectDialog();
    } catch {
      setGlobalError("Network error while saving connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    setTestingConnectionId(connectionId);
    setGlobalError(null);
    setGlobalMessage(null);

    try {
      const response = await fetch(`/api/connections/${connectionId}/test`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setGlobalError(data.error ?? "Connection test failed.");
        return;
      }

      setGlobalMessage("Connection test passed.");
    } catch {
      setGlobalError("Network error during connection test.");
    } finally {
      setTestingConnectionId(null);
    }
  };

  const handleToggleConnection = async (connection: ConnectionItem) => {
    setUpdatingConnectionId(connection.id);
    setGlobalError(null);
    setGlobalMessage(null);

    try {
      const response = await fetch(`/api/connections/${connection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !connection.isActive,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        connection?: ConnectionItem;
      };
      if (!response.ok || !data.connection) {
        setGlobalError(data.error ?? "Could not update connection.");
        return;
      }

      patchConnectionInState(data.connection);
      setGlobalMessage(
        data.connection.isActive
          ? "Connection enabled."
          : "Connection disabled.",
      );
    } catch {
      setGlobalError("Network error while updating connection.");
    } finally {
      setUpdatingConnectionId(null);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    setUpdatingConnectionId(connectionId);
    setGlobalError(null);
    setGlobalMessage(null);

    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setGlobalError(data.error ?? "Could not delete connection.");
        return;
      }

      removeConnectionFromState(connectionId);
      setGlobalMessage("Connection removed.");
    } catch {
      setGlobalError("Network error while deleting connection.");
    } finally {
      setUpdatingConnectionId(null);
    }
  };

  const selectedIntegration =
    selectedType !== null
      ? integrationCatalog.find(
          (integration) => integration.type === selectedType,
        )
      : undefined;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {integrationCatalog.map((integration) => {
          const typedConnections =
            connectionsByType.get(integration.type) ?? [];
          const activeCount = typedConnections.filter(
            (item) => item.isActive,
          ).length;
          const connected = activeCount > 0;
          const supported = supportedConnectTypes.has(integration.type);

          return (
            <Card key={integration.type}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <p className="shrink-0 text-3xl">{integration.icon}</p>
                  <div className="min-w-0 flex flex-col gap-1">
                    <CardTitle className="text-lg">
                      {integration.title}
                    </CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
                {connected ? (
                  <Badge className="w-fit shrink-0 bg-success text-white hover:bg-success">
                    <CheckCircle2 className="mr-1 size-3.5" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-fit shrink-0">
                    Not Connected
                  </Badge>
                )}
              </CardHeader>
              <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {activeCount} active connection(s)
                </p>
                <Button
                  size="sm"
                  variant={supported ? "default" : "outline"}
                  onClick={() => openConnectDialog(integration.type)}
                  disabled={!supported}
                >
                  <Link2 className="mr-2 size-4" />
                  {supported
                    ? connected
                      ? "Add Another"
                      : "Connect"
                    : "Coming Soon"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </section>

      {globalMessage ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4 text-sm text-success">
            {globalMessage}
          </CardContent>
        </Card>
      ) : null}

      {globalError ? (
        <Card className="border-error/30 bg-error/5">
          <CardContent className="p-4 text-sm text-error">
            {globalError}
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Your Connections</h2>
        {connections.length > 0 ? (
          <div className="flex flex-col gap-3">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex flex-col gap-1">
                    <p className="font-medium">{connection.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {connection.type.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created:{" "}
                      {new Date(connection.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(connection.id)}
                      disabled={testingConnectionId === connection.id}
                    >
                      {testingConnectionId === connection.id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <FlaskConical className="mr-2 size-4" />
                      )}
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleConnection(connection)}
                      disabled={updatingConnectionId === connection.id}
                    >
                      <Power className="mr-2 size-4" />
                      {connection.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConnection(connection.id)}
                      disabled={updatingConnectionId === connection.id}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No accounts connected yet</CardTitle>
              <CardDescription>
                Connect Razorpay, WhatsApp, or Google Sheets and start workflow
                automation immediately.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      <Dialog
        open={selectedType !== null}
        onOpenChange={(open) => (open ? null : closeConnectDialog())}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Connect {selectedIntegration?.title ?? "integration"}
            </DialogTitle>
            <DialogDescription>
              Add credentials once. JODO will verify and save them
              securely.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="connection-name">Connection name</Label>
              <Input
                id="connection-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder={
                  selectedType
                    ? defaultConnectionName(selectedType)
                    : "Primary Connection"
                }
              />
            </div>

            {selectedType === "WHATSAPP_BUSINESS" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="wa-phone-id">Phone number ID</Label>
                  <Input
                    id="wa-phone-id"
                    value={formState.phoneNumberId}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        phoneNumberId: event.target.value,
                      }))
                    }
                    placeholder="109876543210"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="wa-token">Access token</Label>
                  <Input
                    id="wa-token"
                    type="password"
                    value={formState.accessToken}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        accessToken: event.target.value,
                      }))
                    }
                    placeholder="EAAG..."
                  />
                </div>
              </>
            ) : null}

            {selectedType === "RAZORPAY" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="razorpay-key-id">Key ID</Label>
                  <Input
                    id="razorpay-key-id"
                    value={formState.keyId}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        keyId: event.target.value,
                      }))
                    }
                    placeholder="rzp_live_..."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="razorpay-key-secret">Key secret</Label>
                  <Input
                    id="razorpay-key-secret"
                    type="password"
                    value={formState.keySecret}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        keySecret: event.target.value,
                      }))
                    }
                    placeholder="secret"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="razorpay-webhook-secret">
                    Webhook secret
                  </Label>
                  <Input
                    id="razorpay-webhook-secret"
                    type="password"
                    value={formState.webhookSecret}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        webhookSecret: event.target.value,
                      }))
                    }
                    placeholder="whsec_..."
                  />
                </div>
              </>
            ) : null}

            {selectedType === "GOOGLE_SHEETS" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="gs-access-token">Access token</Label>
                  <Input
                    id="gs-access-token"
                    type="password"
                    value={formState.accessToken}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        accessToken: event.target.value,
                      }))
                    }
                    placeholder="ya29..."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="gs-sheet-id">Spreadsheet ID</Label>
                  <Input
                    id="gs-sheet-id"
                    value={formState.spreadsheetId}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        spreadsheetId: event.target.value,
                      }))
                    }
                    placeholder="1AbCdEf..."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="gs-sheet-name">Sheet name</Label>
                  <Input
                    id="gs-sheet-name"
                    value={formState.sheetName}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        sheetName: event.target.value,
                      }))
                    }
                    placeholder="Sheet1"
                  />
                </div>
              </>
            ) : null}

            {selectedType === "ZOHO_BOOKS" ? (
              <>
                <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Add Zoho Books access token + organization ID. (OAuth connect
                  flow can be added next; this keeps the template runnable
                  end-to-end now.)
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="zoho-access-token">Access token</Label>
                  <Input
                    id="zoho-access-token"
                    type="password"
                    value={formState.accessToken}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        accessToken: event.target.value,
                      }))
                    }
                    placeholder="1000.xxxxx"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="zoho-org-id">Organization ID</Label>
                  <Input
                    id="zoho-org-id"
                    value={formState.zohoOrganizationId}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        zohoOrganizationId: event.target.value,
                      }))
                    }
                    placeholder="600000000000123"
                  />
                </div>
              </>
            ) : null}

            {selectedType === "INSTAGRAM" ? (
              <>
                <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Connect Instagram Business using a Meta Graph API access token
                  + IG account ID.
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ig-access-token">Access token</Label>
                  <Input
                    id="ig-access-token"
                    type="password"
                    value={formState.accessToken}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        accessToken: event.target.value,
                      }))
                    }
                    placeholder="EAAG..."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ig-account-id">Instagram account ID</Label>
                  <Input
                    id="ig-account-id"
                    value={formState.instagramAccountId}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        instagramAccountId: event.target.value,
                      }))
                    }
                    placeholder="178414..."
                  />
                </div>
              </>
            ) : null}

            {selectedType === "EXOTEL" ? (
              <>
                <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Exotel will send missed call webhooks instantly. Save API
                  key/token + webhook secret.
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="exotel-key">API key</Label>
                  <Input
                    id="exotel-key"
                    value={formState.exotelApiKey}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        exotelApiKey: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="exotel-token">API token</Label>
                  <Input
                    id="exotel-token"
                    type="password"
                    value={formState.exotelApiToken}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        exotelApiToken: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="exotel-webhook-secret">Webhook secret</Label>
                  <Input
                    id="exotel-webhook-secret"
                    type="password"
                    value={formState.webhookSecret}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        webhookSecret: event.target.value,
                      }))
                    }
                    placeholder="whsec_..."
                  />
                </div>
              </>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeConnectDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveConnection}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Verify & Save Connection"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
