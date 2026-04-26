import { FavoritesClient } from "@/features/catalog/components/favorites-client";

export default function FavoritesPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      <section className="mx-auto w-full max-w-[1360px] px-5 py-10">
        <p className="mb-6 text-sm text-[#677279]">Pagina inicial › Favoritos</p>
        <h1 className="mb-8 text-center text-4xl font-medium tracking-normal text-black">Favoritos</h1>
        <FavoritesClient />
      </section>
    </main>
  );
}
