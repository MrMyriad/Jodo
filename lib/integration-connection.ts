import { IntegrationType } from "@prisma/client";
import { decryptConnectionCredentials } from "@/lib/connection-service";
import { prisma } from "@/lib/prisma";

export async function getActiveIntegrationCredentials(
  userId: string,
  type: IntegrationType,
) {
  const connection = await prisma.integration.findFirst({
    where: {
      userId,
      type,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      type: true,
      credentials: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!connection) {
    return null;
  }

  return {
    id: connection.id,
    name: connection.name,
    type: connection.type,
    credentials: decryptConnectionCredentials(connection.credentials),
  };
}

