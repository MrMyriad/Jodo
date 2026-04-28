import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const execution = await prisma.execution.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: {
        id: true,
        status: true,
        triggerData: true,
        stepResults: true,
        error: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!execution) {
      return NextResponse.json({ error: "Execution not found." }, { status: 404 });
    }

    return NextResponse.json({ execution });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch execution." }, { status: 500 });
  }
}
