export function extractIndianPhoneNumber(
  text: string | null | undefined,
): string | null {
  if (!text) return null;

  // Matches:
  // - +91XXXXXXXXXX (with optional spaces/dashes)
  // - 91XXXXXXXXXX
  // - XXXXXXXXXX starting with 6-9 (common Indian mobile)
  const match =
    text.match(/(\+91[\s-]?\d{10})/) ??
    text.match(/\b91\d{10}\b/) ??
    text.match(/\b[6-9]\d{9}\b/);

  if (!match) return null;

  const digits = match[0].replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;

  return null;
}
