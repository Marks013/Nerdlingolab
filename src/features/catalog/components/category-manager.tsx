import type { Category } from "@/generated/prisma/client";

import { createCategory } from "@/actions/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps): React.ReactElement {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <CardDescription>Organize coleções e seções da vitrine.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-muted-foreground">/{category.slug}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {category.isActive ? "Ativa" : "Oculta"}
                </span>
              </div>
            ))}
            {categories.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova categoria</CardTitle>
          <CardDescription>O slug será gerado automaticamente se ficar vazio.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCategory} className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              Nome
              <Input name="name" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Slug
              <Input name="slug" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              URL da imagem
              <Input name="imageUrl" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Descrição
              <Textarea name="description" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked name="isActive" type="checkbox" />
              Categoria ativa
            </label>
            <Button className="w-full" type="submit">
              Criar categoria
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
