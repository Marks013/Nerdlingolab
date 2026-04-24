import { EmptyState } from "@/components/feedback/empty-state";

export default function NotFoundPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <EmptyState
        actionHref="/"
        actionLabel="Voltar para a vitrine"
        description="Não encontramos o conteúdo solicitado. Confira o endereço ou continue navegando pela loja."
        title="Página não encontrada"
        tone="info"
      />
    </main>
  );
}
