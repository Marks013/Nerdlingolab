import { AlertTriangle, CheckCircle2, Clock, ExternalLink, PackageCheck, Truck } from "lucide-react";

import type { Shipment, ShipmentEvent } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export type ShipmentWithEvents = Shipment & { events: ShipmentEvent[] };

interface ShipmentTrackingPanelProps {
  shipments: ShipmentWithEvents[];
}

export function ShipmentTrackingPanel({ shipments }: ShipmentTrackingPanelProps): React.ReactElement {
  if (shipments.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum rastreamento registrado.</p>;
  }

  const latestShipment = shipments[0];
  const isOverdue = isShipmentOverdue(latestShipment);

  return (
    <div id="rastreamento" className="space-y-5 scroll-mt-24">
      {isOverdue ? (
        <div className="rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-4 text-orange-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
            <div>
              <p className="font-black">Estamos analisando o atraso e acompanhando de perto o pedido.</p>
              <p className="mt-1 text-sm">
                Nossa equipe ja foi notificada e esta monitorando cada atualizacao do rastreio.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center text-sm font-bold text-primary">
              <Truck className="mr-2 h-4 w-4" />
              {latestShipment.carrierName ?? formatShippingProvider(latestShipment.provider)}
            </p>
            <h3 className="mt-2 text-2xl font-black text-foreground">
              {formatShipmentStatus(latestShipment.status)}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Codigo: {latestShipment.trackingNumber ?? latestShipment.externalShipmentId ?? "indisponivel"}
            </p>
          </div>

          {latestShipment.carrierUrl ? (
            <Button asChild className="shrink-0">
              <a href={latestShipment.carrierUrl} rel="noreferrer" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Rastrear entrega
              </a>
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <TrackingMetric icon={Clock} label="Prazo estimado" value={latestShipment.estimatedDeliveryAt ? formatDateTime(latestShipment.estimatedDeliveryAt) : "Nao informado"} />
          <TrackingMetric icon={PackageCheck} label="Postado em" value={latestShipment.shippedAt ? formatDateTime(latestShipment.shippedAt) : "Aguardando postagem"} />
          <TrackingMetric icon={CheckCircle2} label="Entregue em" value={latestShipment.deliveredAt ? formatDateTime(latestShipment.deliveredAt) : "Ainda em andamento"} />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-black uppercase text-muted-foreground">Historico do rastreio</h4>
        <ol className="mt-3 space-y-3">
          {shipments.flatMap((shipment) => shipment.events).length > 0 ? (
            shipments.flatMap((shipment) => shipment.events).map((event) => (
              <li className="rounded-lg border bg-background p-4" key={event.id}>
                <p className="font-semibold">{formatShipmentStatus(event.status)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(event.occurredAt)}
                  {event.substatus ? ` · ${event.substatus}` : ""}
                </p>
                {event.description ? <p className="mt-2 text-sm">{event.description}</p> : null}
              </li>
            ))
          ) : (
            <li className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              O historico sera exibido assim que a transportadora publicar novas atualizacoes.
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

function TrackingMetric({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="rounded-md border px-3 py-3">
      <p className="inline-flex items-center text-xs font-bold uppercase text-muted-foreground">
        <Icon className="mr-2 h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

export function formatShippingProvider(provider: string): string {
  if (provider === "MELHOR_ENVIO") {
    return "Melhor Envio";
  }

  return provider === "MERCADO_ENVIOS" ? "Mercado Envios" : "Rastreamento manual";
}

export function formatShipmentStatus(status: string): string {
  const labels: Record<string, string> = {
    CANCELLED: "Cancelado",
    DELAYED: "Atrasado",
    DELIVERED: "Entregue",
    HANDLING: "Em preparacao",
    PENDING: "Pendente",
    READY_TO_SHIP: "Pronto para envio",
    SHIPPED: "Enviado",
    UNKNOWN: "Status indisponivel"
  };

  return labels[status] ?? "Status indisponivel";
}

export function isShipmentOverdue(shipment: Shipment): boolean {
  return Boolean(
    shipment.estimatedDeliveryAt
    && shipment.estimatedDeliveryAt.getTime() < Date.now()
    && !shipment.deliveredAt
    && shipment.status !== "DELIVERED"
    && shipment.status !== "CANCELLED"
  );
}
