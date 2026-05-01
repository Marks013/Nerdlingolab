"use client";

import { Grid3X3, Rows3 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PublicProductSort } from "@/lib/catalog/queries";

interface ProductCatalogControlsProps {
  perPage: number;
  sort: PublicProductSort;
  view: "grid" | "list";
}

export function ProductCatalogControls({
  perPage,
  sort,
  view
}: ProductCatalogControlsProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateCatalog(nextValues: Record<string, string>): void {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(nextValues)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    router.push(`${pathname}?${params.toString()}#catalogo-produtos`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-[#4f5d65]">
        Mostrar:
        <select
          className="h-10 rounded-lg border bg-white px-3 text-sm text-black outline-none focus:border-primary"
          onChange={(event) => updateCatalog({ pagina: "", porPagina: event.target.value })}
          value={String(perPage)}
        >
          <option value="24">24 por página</option>
          <option value="48">48 por página</option>
          <option value="96">96 por página</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-[#4f5d65]">
        Ordenar
        <select
          className="h-10 rounded-lg border bg-white px-3 text-sm text-black outline-none focus:border-primary"
          onChange={(event) => updateCatalog({ ordem: event.target.value, pagina: "" })}
          value={sort}
        >
          <option value="recomendados">Recomendadas</option>
          <option value="nome">Ordem alfabética, A-Z</option>
          <option value="recentes">Mais recentes</option>
          <option value="mais-vendidos">Mais vendidos</option>
          <option value="menor-valor">Menor valor</option>
          <option value="maior-valor">Maior valor</option>
        </select>
      </label>

      <div className="hidden items-center gap-1 text-[#4f5d65] sm:flex" aria-label="Visualização">
        <span className="text-sm">Visualização</span>
        <button
          aria-label="Visualizar produtos em grade"
          className={view === "grid"
            ? "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white"
            : "inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-[#4f5d65]"}
          onClick={() => updateCatalog({ visualizacao: "grid" })}
          type="button"
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
        <button
          aria-label="Visualizar produtos em lista"
          className={view === "list"
            ? "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white"
            : "inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-[#4f5d65]"}
          onClick={() => updateCatalog({ visualizacao: "list" })}
          type="button"
        >
          <Rows3 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
