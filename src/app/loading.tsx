import { EmptyState } from "@/components/feedback/empty-state";

export default function LoadingPage(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <EmptyState
        description="Estamos preparando as informações para você."
        title="Carregando"
        tone="loading"
      />
    </main>
  );
}
