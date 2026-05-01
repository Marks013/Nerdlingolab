import { deleteMarketingPopup, saveMarketingPopup, saveNotificationTemplate } from "@/actions/engagement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThemeImageField } from "@/features/theme/components/theme-image-field";
import { ensureNotificationTemplates } from "@/lib/engagement/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEngagementPage(): Promise<React.ReactElement> {
  await ensureNotificationTemplates();

  const [popups, templates] = await Promise.all([
    prisma.marketingPopup.findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 12
    }),
    prisma.notificationTemplate.findMany({
      orderBy: { name: "asc" }
    })
  ]);
  const activePopups = popups.filter((popup) => popup.isActive).length;
  const activeTemplates = templates.filter((template) => template.isActive).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Campanhas e alertas</p>
        <h1 className="text-3xl font-bold tracking-normal">Engajamento</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Configure popups de campanha e templates de e-mail para cada situação importante da loja.
        </p>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        <EngagementMetric label="Popups salvos" value={String(popups.length)} />
        <EngagementMetric label="Popups ativos" value={String(activePopups)} />
        <EngagementMetric label="Templates de e-mail" value={String(templates.length)} />
        <EngagementMetric label="Templates ativos" value={String(activeTemplates)} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Novo popup</CardTitle>
            <CardDescription>Use para anúncio, cupom, lançamento, NerdCoins ou aviso urgente.</CardDescription>
          </CardHeader>
          <CardContent>
            <PopupForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popups ativos e salvos</CardTitle>
            <CardDescription>O popup ativo de maior prioridade aparece primeiro.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {popups.map((popup) => (
              <div className="rounded-lg border p-4" key={popup.id}>
                <PopupForm popup={popup} />
                <form action={deleteMarketingPopup} className="mt-3">
                  <input name="id" type="hidden" value={popup.id} />
                  <Button size="sm" type="submit" variant="outline">Excluir popup</Button>
                </form>
              </div>
            ))}
            {popups.length === 0 ? (
              <p className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhum popup criado ainda.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-normal">Templates de e-mail</h2>
          <p className="text-sm text-muted-foreground">
            Cada card abaixo representa uma situação automática do site. Mantenha assunto, prévia, mensagem e botão coerentes com o fluxo.
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>
                Variáveis úteis: {"{{customerName}}"}, {"{{cartUrl}}"}, {"{{resetUrl}}"}, {"{{couponCode}}"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={saveNotificationTemplate} className="grid gap-3">
                <input name="id" type="hidden" value={template.id} />
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input defaultChecked={template.isActive} name="isActive" type="checkbox" />
                  Template ativo
                </label>
                <TextField defaultValue={template.subject} label="Assunto" name="subject" />
                <TextField defaultValue={template.previewText ?? ""} label="Prévia" name="previewText" />
                <label className="grid gap-2 text-sm font-medium">
                  Mensagem
                  <Textarea defaultValue={template.body} name="body" rows={7} />
                </label>
                <TextField defaultValue={template.ctaLabel ?? ""} label="Texto do botão" name="ctaLabel" />
                <TextField defaultValue={template.ctaHref ?? ""} label="Link do botão" name="ctaHref" />
                <TextField defaultValue={String(template.cooldownHours)} label="Intervalo entre alertas (horas)" name="cooldownHours" type="number" />
                <Button type="submit">Salvar template</Button>
              </form>
            </CardContent>
          </Card>
        ))}
        </div>
      </section>
    </main>
  );
}

function EngagementMetric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}

function PopupForm({
  popup
}: {
  popup?: {
    audience: string;
    ctaHref: string | null;
    ctaLabel: string | null;
    description: string;
    endsAt: Date | null;
    eyebrow: string | null;
    frequencyHours: number;
    id: string;
    imageUrl: string | null;
    isActive: boolean;
    placement: string;
    priority: number;
    startsAt: Date | null;
    themeTone: string;
    title: string;
    triggerType: string;
    triggerValue: number;
  };
}): React.ReactElement {
  return (
    <form action={saveMarketingPopup} className="grid gap-3">
      {popup ? <input name="id" type="hidden" value={popup.id} /> : null}
      <label className="flex items-center gap-2 text-sm font-medium">
        <input defaultChecked={popup?.isActive ?? false} name="isActive" type="checkbox" />
        Popup ativo
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <TextField defaultValue={popup?.title ?? ""} label="Título" name="title" />
        <TextField defaultValue={popup?.eyebrow ?? ""} label="Etiqueta" name="eyebrow" />
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Descrição
        <Textarea defaultValue={popup?.description ?? ""} name="description" rows={4} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <TextField defaultValue={popup?.ctaLabel ?? ""} label="Texto do botão" name="ctaLabel" />
        <TextField defaultValue={popup?.ctaHref ?? ""} label="Link do botão" name="ctaHref" />
        <ThemeImageField defaultValue={popup?.imageUrl ?? ""} label="Imagem" name="imageUrl" />
        <TextField defaultValue={String(popup?.priority ?? 0)} label="Prioridade" name="priority" type="number" />
        <TextField defaultValue={String(popup?.triggerValue ?? 1200)} label="Atraso para aparecer (ms)" name="triggerValue" type="number" />
        <TextField defaultValue={String(popup?.frequencyHours ?? 24)} label="Repetir depois de (horas)" name="frequencyHours" type="number" />
      </div>
      <input name="audience" type="hidden" value={popup?.audience ?? "ALL"} />
      <input name="placement" type="hidden" value={popup?.placement ?? "GLOBAL"} />
      <input name="themeTone" type="hidden" value={popup?.themeTone ?? "ORANGE"} />
      <input name="triggerType" type="hidden" value={popup?.triggerType ?? "DELAY"} />
      <Button type="submit">{popup ? "Salvar popup" : "Criar popup"}</Button>
    </form>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  type = "text"
}: {
  defaultValue: string;
  label: string;
  name: string;
  type?: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input defaultValue={defaultValue} name={name} type={type} />
    </label>
  );
}
