import { ShopHeader } from "@/components/shop/shop-header";
import { ShopFooter } from "@/components/shop/shop-footer";

export default function ShopLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <>
      <a
        className="sr-only z-50 rounded-br-lg bg-white px-4 py-3 text-sm font-black text-primary shadow focus:not-sr-only focus:fixed focus:left-0 focus:top-0"
        href="#conteudo-principal"
      >
        Pular
      </a>
      <ShopHeader />
      <div id="conteudo-principal">{children}</div>
      <ShopFooter />
    </>
  );
}
