import { ShopHeader } from "@/components/shop/shop-header";
import { ShopFooter } from "@/components/shop/shop-footer";
import { MarketingPopup } from "@/components/shop/marketing-popup";
import { auth } from "@/lib/auth";
import { getActiveMarketingPopup } from "@/lib/engagement/config";
import { getStorefrontTheme } from "@/lib/theme/storefront";

export const dynamic = "force-dynamic";

export default async function ShopLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const [session, theme, popup] = await Promise.all([auth(), getStorefrontTheme(), getActiveMarketingPopup()]);

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
      <MarketingPopup popup={popup} />
      <ShopFooter theme={theme} />
    </>
  );
}
