import { Prisma } from "@prisma/client";

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  const normalized = JSON.parse(
    JSON.stringify(value, (_key, entry) => {
      if (typeof entry === "undefined") {
        return null;
      }

      return entry;
    }),
  );

  if (normalized === null) {
    return {} as Prisma.InputJsonObject;
  }

  return normalized as Prisma.InputJsonValue;
}
