export function isGstDeskEnabled(): boolean {
  return process.env.GST_DESK_ENABLED?.trim().toLowerCase() !== "false";
}

export function getGstDeskDisabledMessage(): string {
  return "GST Desk is disabled. Set GST_DESK_ENABLED=true to enable this module.";
}
