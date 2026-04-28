"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GoogleSheetsConnectPage() {
  const [name, setName] = useState("Primary Google Sheet");
  const [accessToken, setAccessToken] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GOOGLE_SHEETS",
          name,
          credentials: { accessToken, spreadsheetId, sheetName },
          testBeforeSave: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save Google Sheets connection.");
        return;
      }

      setMessage("✓ Google Sheets connected");
    } catch {
      setMessage("Network error while saving Google Sheets.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-6">
      <header className="mb-4">
        <p className="text-sm text-muted-foreground">
          <Link href="/connections" className="hover:underline">
            Connections
          </Link>{" "}
          / Google Sheets
        </p>
        <h1 className="text-3xl font-semibold">Connect Google Sheets</h1>
        <p className="text-muted-foreground">
          Provide an access token and spreadsheet details for appending rows.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label>Connection name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label>Access token</Label>
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>

          <div>
            <Label>Spreadsheet ID</Label>
            <Input
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="1AbCdEf..."
            />
          </div>

          <div>
            <Label>Sheet name</Label>
            <Input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={save}
              disabled={isSaving || !accessToken || !spreadsheetId}
            >
              {isSaving ? "Saving..." : "Test & Save"}
            </Button>
          </div>

          {message ? (
            <div className="text-sm text-muted-foreground">{message}</div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
