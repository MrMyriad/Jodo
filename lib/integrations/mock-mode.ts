export function isMockIntegrationModeEnabled(): boolean {
  return (
    process.env.JODO_MOCK_INTEGRATIONS === "1" ||
    process.env.AUTOMATEDESI_MOCK_INTEGRATIONS === "1"
  );
}
