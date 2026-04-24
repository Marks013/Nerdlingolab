import { CouponType, type Coupon } from "@prisma/client";

import { createCoupon, deactivateCoupon } from "@/actions/coupons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

interface CouponManagerProps {
  coupons: Coupon[];
}

export function CouponManager({ coupons }: CouponManagerProps): React.ReactElement {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Cupons</CardTitle>
          <CardDescription>Descontos ativos e histórico de uso.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-medium">{coupon.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {describeCouponValue(coupon)} · usado {coupon.usedCount} vez(es)
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {coupon.isActive ? "Ativo" : "Inativo"}
                </span>
                <form action={deactivateCoupon.bind(null, coupon.id)}>
                  <Button disabled={!coupon.isActive} size="sm" type="submit" variant="outline">
                    Desativar
                  </Button>
                </form>
              </div>
            ))}
            {coupons.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum cupom cadastrado.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo cupom</CardTitle>
          <CardDescription>O código será salvo em caixa alta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCoupon} className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              Código
              <Input name="code" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Tipo
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" name="type">
                <option value={CouponType.PERCENTAGE}>Percentual</option>
                <option value={CouponType.FIXED_AMOUNT}>Valor fixo</option>
                <option value={CouponType.FREE_SHIPPING}>Frete grátis</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Valor
              <Input name="value" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Subtotal mínimo
              <Input name="minSubtotal" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Desconto máximo
              <Input name="maxDiscount" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Limite global
              <Input min={1} name="usageLimit" type="number" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Limite por cliente
              <Input min={1} name="perCustomerLimit" type="number" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Expiração
              <Input name="expiresAt" type="datetime-local" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked name="isActive" type="checkbox" />
              Cupom ativo
            </label>
            <Button className="w-full" type="submit">
              Criar cupom
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function describeCouponValue(coupon: Coupon): string {
  if (coupon.type === CouponType.PERCENTAGE) {
    return `${coupon.value}%`;
  }

  if (coupon.type === CouponType.FREE_SHIPPING) {
    return "Frete grátis";
  }

  return formatCurrency(coupon.value);
}
