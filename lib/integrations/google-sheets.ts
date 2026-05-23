import { isMockIntegrationModeEnabled } from "@/lib/integrations/mock-mode";

type SheetsConfig = {
  accessToken: string;
  spreadsheetId: string;
  sheetName: string;
};

export async function appendToSheet(config: SheetsConfig, values: unknown[][]) {
  if (isMockIntegrationModeEnabled()) {
    return {
      mock: true,
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
      rowsAppended: values.length,
    };
  }

  const encodedRange = encodeURIComponent(`${config.sheetName}!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Google Sheets append failed (${response.status}): ${details}`,
    );
  }

  return response.json();
}
