import { resetStorefrontTheme, updateStorefrontTheme } from "@/actions/storefront-theme";
import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeImageField } from "@/features/theme/components/theme-image-field";
import { getStorefrontTheme, type StorefrontSlide } from "@/lib/theme/storefront";

export const dynamic = "force-dynamic";

export default async function AdminThemePage(): Promise<React.ReactElement> {
  const theme = await getStorefrontTheme();

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Editor visual</p>
          <h1 className="text-3xl font-bold tracking-normal">Tema da vitrine</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Controle os slides da home sem alterar codigo. As imagens devem vir da biblioteca de midia ou de novo upload.
          </p>
        </div>
        <form action={resetStorefrontTheme}>
          <Button type="submit" variant="outline">Restaurar padrao</Button>
        </form>
      </div>

      <form action={updateStorefrontTheme} className="mt-6 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Identidade do tema</CardTitle>
            <CardDescription>Nome interno para rastrear alteracoes no admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <TextField defaultValue={theme.name} label="Nome do tema" name="name" />
              <TextField defaultValue={theme.announcementText} label="Aviso no topo" name="announcementText" />
              <TextField
                defaultValue={(theme.freeShippingThresholdCents / 100).toFixed(2).replace(".", ",")}
                label="Valor minimo para frete gratis"
                name="freeShippingThresholdCents"
              />
              <TextField
                defaultValue={String(theme.maxInstallments)}
                label="Maximo de parcelas"
                name="maxInstallments"
                type="number"
              />
              <TextField
                defaultValue={(theme.cardInstallmentMonthlyRateBps / 100).toFixed(2).replace(".", ",")}
                label="Juros mensal do cartao (%)"
                name="cardInstallmentMonthlyRatePercent"
              />
              <TextField
                defaultValue={(theme.pixDiscountBps / 100).toFixed(2).replace(".", ",")}
                label="Desconto Pix (%)"
                name="pixDiscountPercent"
              />
              <label className="grid gap-2 text-sm font-medium">
                Fonte das taxas
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  defaultValue={theme.paymentFeeSource}
                  name="paymentFeeSource"
                >
                  <option value="MANUAL">Manual no admin</option>
                  <option value="MERCADO_PAGO">Referencia Mercado Pago</option>
                </select>
              </label>
              <TextField defaultValue={theme.supportEmail} label="E-mail de atendimento" name="supportEmail" />
              <TextField defaultValue={theme.whatsappLabel} label="WhatsApp exibido" name="whatsappLabel" />
              <TextField defaultValue={theme.instagramUrl} label="Link do Instagram" name="instagramUrl" />
              <TextField defaultValue={theme.newsletterTitle} label="Titulo da newsletter" name="newsletterTitle" />
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Texto da newsletter
                <Input defaultValue={theme.newsletterDescription} name="newsletterDescription" />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Aviso legal do rodape
                <Input defaultValue={theme.footerNotice} name="footerNotice" />
              </label>
            </div>
          </CardContent>
        </Card>

        <SlideEditor
          aspectClassName="aspect-[2048/628]"
          description="Grupo principal no topo da home, com imagens separadas para desktop e mobile."
          group="hero"
          slides={theme.heroSlides}
          title="Slideshow principal"
        />

        <SlideEditor
          aspectClassName="aspect-[2048/628]"
          description="Grupo secundario para campanhas e banners complementares."
          group="promo"
          slides={theme.promoSlides}
          title="Slideshow secundario"
        />

        <div className="sticky bottom-4 z-20 flex justify-end">
          <Button className="shadow-lg" size="lg" type="submit">Salvar tema</Button>
        </div>
      </form>
    </main>
  );
}

function SlideEditor({
  aspectClassName,
  description,
  group,
  slides,
  title
}: {
  aspectClassName: string;
  description: string;
  group: "hero" | "promo";
  slides: StorefrontSlide[];
  title: string;
}): React.ReactElement {
  const rows = [...slides, ...Array.from({ length: Math.max(0, 6 - slides.length) }, () => emptySlide())].slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rows.map((slide, index) => (
          <details className="rounded-lg border bg-background" key={`${group}-${index}`} open={index === 0 && Boolean(slide.alt)}>
            <summary className="grid cursor-pointer list-none gap-4 p-4 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-center">
              <div className={`relative overflow-hidden rounded-lg bg-muted ${aspectClassName}`}>
                {slide.desktop || slide.src || slide.mobile ? (
                  <Image
                    alt={slide.alt || `Slide ${index + 1}`}
                    className="object-cover"
                    fill
                    sizes="260px"
                    src={slide.desktop ?? slide.src ?? slide.mobile ?? ""}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="grid min-w-0 gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input defaultChecked={Boolean(slide.alt)} name={`${group}-${index}-enabled`} type="checkbox" />
                    Slide {index + 1} ativo
                  </label>
                  <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                    {slide.desktop && slide.mobile ? "Desktop + mobile" : "Imagem unica"}
                  </span>
                </div>
                <p className="truncate text-sm font-semibold">{slide.alt || "Novo slide"}</p>
              </div>
            </summary>
            <div className="grid gap-4 border-t p-4 xl:grid-cols-[260px_minmax(0,1fr)]">
              <div className="hidden xl:block" />
              <div className="grid min-w-0 gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField defaultValue={slide.alt} label="Texto alternativo" name={`${group}-${index}-alt`} />
                  <TextField defaultValue={slide.href} label="Destino do clique" name={`${group}-${index}-href`} />
                  <ThemeImageField defaultValue={slide.desktop} label="Imagem desktop" name={`${group}-${index}-desktop`} />
                  <ThemeImageField defaultValue={slide.mobile} label="Imagem mobile" name={`${group}-${index}-mobile`} />
                  <ThemeImageField defaultValue={slide.src} label="Imagem unica" name={`${group}-${index}-src`} />
                </div>
              </div>
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  type = "text"
}: {
  defaultValue?: string;
  label: string;
  name: string;
  type?: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input defaultValue={defaultValue ?? ""} name={name} type={type} />
    </label>
  );
}

function emptySlide(): StorefrontSlide {
  return {
    alt: "",
    href: "",
    src: ""
  };
}
