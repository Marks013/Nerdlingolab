import { ShopHeader } from "@/components/shop/shop-header";

export default function ShopLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <>
      <ShopHeader />
      {children}
    </>
  );
}
