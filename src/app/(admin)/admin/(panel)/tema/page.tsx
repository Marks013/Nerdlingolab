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
            Controle os slides da home sem alterar código. Use URLs do diretório public, MinIO/CDN ou links HTTPS.
          </p>
        </div>
        <form action={resetStorefrontTheme}>
          <Button variant="outline" type="submit">Restaurar padrão</Button>
        </form>
      </div>

      <form action={updateStorefrontTheme} className="mt-6 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Identidade do tema</CardTitle>
            <CardDescription>Nome interno para rastrear alterações no admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <TextField defaultValue={theme.name} label="Nome do tema" name="name" />
              <TextField defaultValue={theme.announcementText} label="Aviso no topo" name="announcementText" />
              <TextField
                defaultValue={(theme.freeShippingThresholdCents / 100).toFixed(2).replace(".", ",")}
                label="Valor mínimo para frete grátis"
                name="freeShippingThresholdCents"
              />
              <TextField defaultValue={theme.supportEmail} label="E-mail de atendimento" name="supportEmail" />
              <TextField defaultValue={theme.whatsappLabel} label="WhatsApp exibido" name="whatsappLabel" />
              <TextField defaultValue={theme.instagramUrl} label="Link do Instagram" name="instagramUrl" />
              <TextField defaultValue={theme.newsletterTitle} label="Título da newsletter" name="newsletterTitle" />
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Texto da newsletter
                <Input defaultValue={theme.newsletterDescription} name="newsletterDescription" />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Aviso legal do rodapé
                <Input defaultValue={theme.footerNotice} name="footerNotice" />
              </label>
            </div>
          </CardContent>
        </Card>

        <SlideEditor
          aspectClassName="aspect-[2048/628]"
          description="Slideshow principal no topo da home, com imagem desktop e mobile."
          group="hero"
          slides={theme.heroSlides}
          title="Slideshow principal"
        />

        <SlideEditor
          aspectClassName="aspect-square md:aspect-[16/7]"
          description="Slideshow abaixo dos selos de confiança. Funciona como vitrine de campanhas e páginas."
          group="promo"
          slides={theme.promoSlides}
          title="Slideshow secundário"
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
          <div className="grid gap-4 rounded-lg border p-4 xl:grid-cols-[260px_minmax(0,1fr)]" key={`${group}-${index}`}>
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
            <div className="grid min-w-0 gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input defaultChecked={Boolean(slide.alt)} name={`${group}-${index}-enabled`} type="checkbox" />
                  Slide {index + 1} ativo
                </label>
                <span className="text-xs text-muted-foreground">{slide.href || "/produtos"}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <TextField defaultValue={slide.alt} label="Texto alternativo" name={`${group}-${index}-alt`} />
                <TextField defaultValue={slide.href} label="Link do clique" name={`${group}-${index}-href`} />
                <ThemeImageField defaultValue={slide.desktop} label="Imagem desktop" name={`${group}-${index}-desktop`} />
                <ThemeImageField defaultValue={slide.mobile} label="Imagem mobile" name={`${group}-${index}-mobile`} />
                <ThemeImageField defaultValue={slide.src} label="Imagem única" name={`${group}-${index}-src`} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TextField({
  defaultValue,
  label,
  name
}: {
  defaultValue?: string;
  label: string;
  name: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input defaultValue={defaultValue ?? ""} name={name} />
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
