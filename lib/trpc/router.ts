import { z } from "zod";
import { workflowTemplates } from "@/lib/template-catalog";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc/server";

export const appRouter = router({
  health: publicProcedure.query(() => {
    return {
      ok: true,
      service: "jodo-trpc",
      timestamp: new Date().toISOString(),
    };
  }),

  templates: router({
    list: publicProcedure.query(() => {
      return workflowTemplates;
    }),
  }),

  user: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          id: true,
          email: true,
          name: true,
          language: true,
          plan: true,
          tasksUsedThisMonth: true,
        },
      });

      return user;
    }),
    updateLanguage: protectedProcedure
      .input(z.object({ language: z.enum(["en", "hi"]) }))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.user.update({
          where: { id: ctx.userId },
          data: { language: input.language },
          select: {
            id: true,
            language: true,
          },
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
