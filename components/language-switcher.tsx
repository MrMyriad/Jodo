"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { normalizeLanguage, t, type SupportedLanguage } from "@/lib/i18n";

type LanguageSwitcherProps = {
  initialLanguage: string;
};

export function LanguageSwitcher({ initialLanguage }: LanguageSwitcherProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(
    normalizeLanguage(initialLanguage),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChangeLanguage = async (nextLanguage: SupportedLanguage) => {
    setLanguage(nextLanguage);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/user/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: nextLanguage }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not update language.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Network error while changing language.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="language" className="text-xs text-muted-foreground">
        {t(language, "language.label")}
      </label>
      <div className="flex items-center gap-2">
        <select
          id="language"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={language}
          onChange={(event) =>
            onChangeLanguage(normalizeLanguage(event.target.value))
          }
          disabled={saving}
        >
          <option value="en">{t(language, "language.english")}</option>
          <option value="hi">{t(language, "language.hindi")}</option>
        </select>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
      </div>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
