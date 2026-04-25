import { ShopHeader } from "@/components/shop/shop-header";
import { ShopFooter } from "@/components/shop/shop-footer";

export default function ShopLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <>
      <ShopHeader />
      {children}
      <ShopFooter />
    </>
  );
}
