import { Crown, History, TicketPercent } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const loyaltyBlocks = [
  {
    title: "Ganhe pontos",
    description: "Compras aprovadas geram pontos conforme seus benefícios atuais.",
    icon: Crown
  },
  {
    title: "Resgate no checkout",
    description: "Pontos viram desconto confirmado antes do pagamento.",
    icon: TicketPercent
  },
  {
    title: "Histórico claro",
    description: "Cada ganho, resgate, ajuste ou estorno fica disponível para consulta.",
    icon: History
  }
];

export default function LoyaltyPage(): React.ReactElement {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-normal">Programa de Fidelidade</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Acumule Nerdcoins em compras elegíveis, acompanhe seus benefícios e use recompensas
        em novos pedidos.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {loyaltyBlocks.map((block) => (
          <Card key={block.title}>
            <CardHeader>
              <block.icon className="h-5 w-5 text-primary" />
              <CardTitle>{block.title}</CardTitle>
              <CardDescription>{block.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  );
}
