import { PrismaClient } from "@prisma/client";
import { workflowTemplates } from "../lib/template-catalog";

const prisma = new PrismaClient();

async function main() {
  const templates = workflowTemplates.map((template) => ({
    name: template.title,
    description: template.description,
    category: template.category,
    icon: template.icon,
    trigger: {
      type: template.triggerType,
    },
    steps: template.actions.map((action) => ({
      type: action.type,
      config: {},
    })),
    isPopular:
      template.id === "razorpay-payment-sheet" ||
      template.id === "instagram-dm-whatsapp",
  }));

  let upserted = 0;

  for (const template of templates) {
    const existing = await prisma.template.findFirst({
      where: { name: template.name, category: template.category },
      select: { id: true },
    });

    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          description: template.description,
          icon: template.icon,
          trigger: template.trigger,
          steps: template.steps,
          isPopular: template.isPopular,
        },
      });
    } else {
      await prisma.template.create({
        data: template,
      });
    }

    upserted += 1;
  }

  console.log(`Seeded ${upserted} templates.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
