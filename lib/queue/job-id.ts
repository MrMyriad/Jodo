export function makeBullMqSafeJobId(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, "-");
}
