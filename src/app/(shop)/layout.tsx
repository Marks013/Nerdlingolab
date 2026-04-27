import { ShopHeader } from "@/components/shop/shop-header";
import { ShopFooter } from "@/components/shop/shop-footer";
import { auth } from "@/lib/auth";
import { getStorefrontTheme } from "@/lib/theme/storefront";

export const dynamic = "force-dynamic";

export default async function ShopLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const [session, theme] = await Promise.all([auth(), getStorefrontTheme()]);

  return (
    <>
      <a
        className="sr-only z-50 rounded-br-lg bg-white px-4 py-3 text-sm font-black text-primary shadow focus:not-sr-only focus:fixed focus:left-0 focus:top-0"
        href="#conteudo-principal"
      >
        Pular
      </a>
      <ShopHeader announcementText={theme.announcementText} isAuthenticated={Boolean(session?.user?.id)} />
      <div id="conteudo-principal">{children}</div>
      <ShopFooter theme={theme} />
    </>
  );
}
