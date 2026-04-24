import { Archive, Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { archiveProduct } from "@/actions/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { ProductListItem } from "@/lib/catalog/queries";

interface ProductTableProps {
  products: ProductListItem[];
}

export function ProductTable({ products }: ProductTableProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>Cadastro, preços e status de publicação.</CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/produtos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-md border">
          {products.map((product) => (
            <div key={product.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                  {product.category?.name ?? "Sem categoria"} · {product.status}
                </p>
              </div>
              <p className="text-sm font-medium">{formatCurrency(product.priceCents)}</p>
              <div className="flex gap-2">
                <Button asChild size="icon" variant="outline">
                  <Link href={`/admin/produtos/${product.id}/editar`} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <form action={archiveProduct.bind(null, product.id)}>
                  <Button size="icon" title="Arquivar" type="submit" variant="outline">
                    <Archive className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
          {products.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
