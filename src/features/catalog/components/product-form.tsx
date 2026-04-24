import { ProductStatus, type Category } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductImageUploader } from "@/features/catalog/components/product-image-uploader";
import { getImageUrls } from "@/features/catalog/image-utils";
import { formatCurrency } from "@/lib/format";
import type { ProductListItem } from "@/lib/catalog/queries";

interface ProductFormProps {
  categories: Category[];
  product?: ProductListItem;
  action: (formData: FormData) => Promise<void>;
}

export function ProductForm({ categories, product, action }: ProductFormProps): React.ReactElement {
  const variant = product?.variants[0];
  const imageUrls = getImageUrls(product?.images).join("\n");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? "Editar produto" : "Novo produto"}</CardTitle>
        <CardDescription>Dados centrais do catálogo e estoque inicial.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Título
            <Input defaultValue={product?.title} name="title" required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Slug
            <Input defaultValue={product?.slug} name="slug" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Marca
            <Input defaultValue={product?.brand ?? ""} name="brand" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Categoria
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              defaultValue={product?.categoryId ?? ""}
              name="categoryId"
            >
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Preço
            <Input defaultValue={product ? formatCurrency(product.priceCents) : ""} name="price" required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Preço comparativo
            <Input
              defaultValue={product?.compareAtPriceCents ? formatCurrency(product.compareAtPriceCents) : ""}
              name="compareAtPrice"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            SKU
            <Input defaultValue={variant?.sku ?? ""} name="sku" required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Estoque
            <Input defaultValue={variant?.stockQuantity ?? 0} min={0} name="stockQuantity" type="number" />
          </label>
          <label className="grid gap-2 text-sm font-medium lg:col-span-2">
            Situação
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              defaultValue={product?.status ?? ProductStatus.DRAFT}
              name="status"
            >
              <option value={ProductStatus.DRAFT}>Rascunho</option>
              <option value={ProductStatus.ACTIVE}>Ativo</option>
              <option value={ProductStatus.ARCHIVED}>Arquivado</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium lg:col-span-2">
            Descrição curta
            <Input defaultValue={product?.shortDescription ?? ""} name="shortDescription" />
          </label>
          <label className="grid gap-2 text-sm font-medium lg:col-span-2">
            Descrição completa
            <Textarea defaultValue={product?.description} name="description" required />
          </label>
          <ProductImageUploader defaultValue={imageUrls} />
          <label className="grid gap-2 text-sm font-medium lg:col-span-2">
            Tags
            <Input defaultValue={product?.tags.join(", ") ?? ""} name="tags" />
          </label>
          <Button className="lg:col-span-2" type="submit">
            Salvar produto
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
