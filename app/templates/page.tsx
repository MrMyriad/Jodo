import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/require-user";
import {
  workflowTemplates,
  type TemplateCategory,
} from "@/lib/template-catalog";

function templateGrid(category?: TemplateCategory) {
  const filteredTemplates = category
    ? workflowTemplates.filter((template) => template.category === category)
    : workflowTemplates;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredTemplates.map((template) => (
        <Card
          key={template.id}
          className="flex h-full flex-col justify-between"
        >
          <CardHeader className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <p className="text-3xl">{template.icon}</p>
              <Badge variant="secondary">{template.category}</Badge>
            </div>
            <CardTitle className="text-lg">{template.title}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardFooter className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {template.usageCount}
            </p>
            <Button asChild size="sm">
              <Link
                href={
                  template.id === "razorpay-payment-sheet"
                    ? "/templates/razorpay-whatsapp-invoice"
                    : template.id === "instagram-dm-whatsapp"
                      ? "/templates/instagram-dm-whatsapp-followup"
                      : template.id === "missed-call-whatsapp"
                        ? "/templates/missed-call-whatsapp"
                        : `/workflows/new?template=${template.id}`
                }
              >
                Use Template
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default async function TemplatesPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Ready-to-use templates</h1>
          <p className="text-muted-foreground">
            Start automating in minutes with pre-built workflows optimized for
            Indian businesses.
          </p>
        </section>

        <Tabs defaultValue="all" className="flex flex-col gap-6">
          <TabsList className="w-fit">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
          </TabsList>

          <TabsContent value="all">{templateGrid()}</TabsContent>
          <TabsContent value="whatsapp">{templateGrid("whatsapp")}</TabsContent>
          <TabsContent value="payments">{templateGrid("payments")}</TabsContent>
          <TabsContent value="social">{templateGrid("social")}</TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
