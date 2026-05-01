import type { Metadata } from "next";

import { ShopHeader } from "@/components/shop/shop-header";
import { ShopFooter } from "@/components/shop/shop-footer";
import { FloatingWhatsappButton } from "@/components/shop/floating-whatsapp-button";
import { MarketingPopup } from "@/components/shop/marketing-popup";
import { auth } from "@/lib/auth";
import { getPublicProductSearchSuggestions } from "@/lib/catalog/queries";
import { getActiveMarketingPopup } from "@/lib/engagement/config";
import { getLoyaltyProgramSettings } from "@/lib/loyalty/settings";
import { prisma } from "@/lib/prisma";
import { getStorefrontTheme } from "@/lib/theme/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "NerdLingoLab - Produtos geek, camisetas e action figures",
    template: "%s | NerdLingoLab"
  },
  description: "Loja geek com camisetas, oversized, action figures, NerdCoins, cupons e frete acompanhado.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    description: "Loja geek com camisetas, oversized, action figures, NerdCoins, cupons e frete acompanhado.",
    siteName: "NerdLingoLab",
    title: "NerdLingoLab",
    type: "website"
  }
};

export default async function ShopLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const [session, theme, searchProducts] = await Promise.all([
    auth(),
    getStorefrontTheme(),
    getPublicProductSearchSuggestions()
  ]);
  const popup = session?.user?.id ? null : await getActiveMarketingPopup();
  const nerdcoinsBalance = session?.user?.id ? await getHeaderNerdcoinsBalance(session.user.id) : null;

  return (
    <>
      <a
        className="sr-only z-50 rounded-br-lg bg-white px-4 py-3 text-sm font-black text-primary shadow focus:not-sr-only focus:fixed focus:left-0 focus:top-0"
        href="#conteudo-principal"
      >
        Pular
      </a>
      <ShopHeader
        announcementText={theme.announcementText}
        isAuthenticated={Boolean(session?.user?.id)}
        nerdcoinsBalance={nerdcoinsBalance}
        searchProducts={searchProducts}
      />
      <div id="conteudo-principal">{children}</div>
      <FloatingWhatsappButton />
      <MarketingPopup popup={popup} />
      <ShopFooter theme={theme} />
    </>
  );
}

async function getHeaderNerdcoinsBalance(userId: string): Promise<number | null> {
  const [settings, loyaltyPoints] = await Promise.all([
    getLoyaltyProgramSettings(),
    prisma.loyaltyPoints.findUnique({
      select: { balance: true },
      where: { userId }
    })
  ]);

  if (!settings.isEnabled || !loyaltyPoints) {
    return null;
  }

  return Math.max(0, loyaltyPoints.balance);
}
