import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  decryptConnectionCredentials,
  encryptConnectionCredentials,
  parseConnectionPayload,
  testConnectionByType,
} from "@/lib/connection-service";
import { createRazorpayWebhook } from "@/lib/integrations/razorpay";
import { prisma } from "@/lib/prisma";
import { toPrismaJson } from "@/lib/prisma-json";

const createConnectionRequestSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  credentials: z.record(z.string(), z.unknown()),
  testBeforeSave: z.boolean().optional().default(true),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.integration.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ connections });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestBody: unknown;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedRequest = createConnectionRequestSchema.safeParse(requestBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        details: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  let parsedPayload: ReturnType<typeof parseConnectionPayload>;
  try {
    parsedPayload = parseConnectionPayload(parsedRequest.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid connection payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let verificationResult: unknown = null;
  if (parsedRequest.data.testBeforeSave) {
    try {
      verificationResult = await testConnectionByType(
        parsedPayload.type,
        parsedPayload.credentials,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection test failed.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // Auto-create Razorpay webhook if credentials don't include a webhook secret
  if (parsedPayload.type === "RAZORPAY") {
    try {
      const creds = parsedPayload.credentials as Record<string, unknown>;
      const existing =
        typeof creds.webhookSecret === "string"
          ? creds.webhookSecret.trim()
          : "";
      if (!existing) {
        const baseUrl = (
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.NEXTAUTH_URL ||
          "http://localhost:3000"
        ).replace(/\/+$/, "");
        const webhookUrl = `${baseUrl}/api/webhooks/razorpay`;
        const keyId = typeof creds.keyId === "string" ? creds.keyId : undefined;
        const keySecret =
          typeof creds.keySecret === "string" ? creds.keySecret : undefined;

        if (keyId && keySecret) {
          const { webhook, secret } = await createRazorpayWebhook(
            { keyId, keySecret },
            webhookUrl,
          );
          // persist generated secret in the credentials that will be encrypted and saved
          (parsedPayload.credentials as Record<string, unknown>).webhookSecret =
            secret;
          (parsedPayload.credentials as Record<string, unknown>).webhookId =
            webhook?.id ?? null;
          verificationResult = {
            ...(verificationResult ?? {}),
            webhookCreated: webhook,
          };
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create Razorpay webhook.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  let encryptedCredentials: Record<string, unknown>;
  try {
    encryptedCredentials = encryptConnectionCredentials(
      parsedPayload.credentials,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Credential encryption failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const existing = await prisma.integration.findFirst({
    where: {
      userId: session.user.id,
      type: parsedPayload.type,
      name: parsedPayload.name,
    },
    select: { id: true },
  });

  const connection = existing
    ? await prisma.integration.update({
        where: { id: existing.id },
        data: {
          credentials: toPrismaJson(encryptedCredentials),
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : await prisma.integration.create({
        data: {
          userId: session.user.id,
          type: parsedPayload.type,
          name: parsedPayload.name,
          credentials: toPrismaJson(encryptedCredentials),
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

  const sanitizedCredentials = Object.fromEntries(
    Object.keys(decryptConnectionCredentials(encryptedCredentials)).map(
      (key) => [key, true],
    ),
  );

  return NextResponse.json(
    {
      connection,
      verificationResult,
      credentialFieldsSaved: sanitizedCredentials,
    },
    { status: 201 },
  );
}
