import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  ExternalLink,
  PackageCheck,
  Truck
} from "lucide-react";

import type { Shipment, ShipmentEvent } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ShipmentWithEvents = Shipment & { events: ShipmentEvent[] };

interface ShipmentTrackingPanelProps {
  shipments: ShipmentWithEvents[];
}

export function ShipmentTrackingPanel({ shipments }: ShipmentTrackingPanelProps): React.ReactElement {
  if (shipments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50/60 p-5 text-sm text-muted-foreground dark:border-orange-500/40 dark:bg-orange-950/20">
        <p className="font-semibold text-orange-800 dark:text-orange-200">Rastreamento ainda não registrado.</p>
        <p className="mt-1">Assim que o envio for criado, a linha do tempo aparecerá aqui.</p>
      </div>
    );
  }

  const latestShipment = shipments[0];
  const isOverdue = isShipmentOverdue(latestShipment);
  const events = shipments
    .flatMap((shipment) => shipment.events.map((event) => ({ ...event, carrierName: shipment.carrierName })))
    .sort((eventA, eventB) => eventB.occurredAt.getTime() - eventA.occurredAt.getTime());
  const timeline = events.length > 0
    ? events
    : [{
        carrierName: latestShipment.carrierName,
        createdAt: latestShipment.createdAt,
        description: "Seu pedido já tem uma etiqueta vinculada. Aguardando a primeira atualização da transportadora.",
        id: `${latestShipment.id}-created`,
        occurredAt: latestShipment.createdAt,
        rawPayload: {},
        shipmentId: latestShipment.id,
        status: latestShipment.status,
        substatus: latestShipment.trackingNumber ?? latestShipment.externalShipmentId
      } satisfies ShipmentEvent & { carrierName?: string | null }];

  return (
    <div id="rastreamento" className="space-y-5 scroll-mt-24">
      {isOverdue ? (
        <div className="rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-4 text-orange-900 shadow-sm dark:border-orange-500/50 dark:bg-orange-950/30 dark:text-orange-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
            <div>
              <p className="font-black">Estamos analisando o atraso e acompanhando de perto o pedido.</p>
              <p className="mt-1 text-sm">
                Nossa equipe já foi notificada e acompanha cada atualização do rastreio.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-orange-100 bg-card shadow-sm dark:border-orange-500/30">
        <div className="bg-orange-50/80 px-4 py-4 dark:bg-orange-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center text-sm font-bold text-primary">
              <Truck className="mr-2 size-4" />
              {latestShipment.carrierName ?? formatShippingProvider(latestShipment.provider)}
            </p>
            <h3 className="mt-2 text-2xl font-black text-foreground">
              {formatShipmentStatus(latestShipment.status)}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Código: {latestShipment.trackingNumber ?? latestShipment.externalShipmentId ?? "indisponível"}
            </p>
          </div>

          {latestShipment.carrierUrl ? (
            <Button asChild className="shrink-0 bg-primary text-white hover:bg-primary/90" variant="secondary">
              <a href={latestShipment.carrierUrl} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="mr-2 size-4" />
                Rastrear entrega
              </a>
            </Button>
          ) : null}
        </div>
        </div>

        <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
          <TrackingMetric icon={Clock} label="Prazo estimado" value={latestShipment.estimatedDeliveryAt ? formatDateTime(latestShipment.estimatedDeliveryAt) : "Não informado"} />
          <TrackingMetric icon={PackageCheck} label="Postado em" value={latestShipment.shippedAt ? formatDateTime(latestShipment.shippedAt) : "Aguardando postagem"} />
          <TrackingMetric icon={CheckCircle2} label="Entregue em" value={latestShipment.deliveredAt ? formatDateTime(latestShipment.deliveredAt) : "Ainda em andamento"} />
        </div>
      </div>

      <div className="rounded-lg border border-orange-100 bg-card p-4 shadow-sm dark:border-orange-500/30">
        <h4 className="text-sm font-black uppercase text-muted-foreground">Histórico do rastreio</h4>
        <ol className="relative mt-4 space-y-4 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-orange-200">
          {timeline.map((event, index) => (
            <li className="relative grid grid-cols-[32px_1fr] gap-3" key={event.id}>
              <span
                className={cn(
                  "relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-card shadow-sm",
                  index === 0 ? "border-primary text-primary" : "border-orange-200 text-orange-500"
                )}
              >
                {index === 0 ? <Truck className="size-4" /> : <CircleDot className="size-4" />}
              </span>
              <div
                className={cn(
                  "rounded-lg border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  index === 0
                    ? "border-orange-200 bg-orange-50/70 dark:border-orange-500/40 dark:bg-orange-950/25"
                    : "border-orange-100 bg-card dark:border-orange-500/30"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-bold text-foreground">{formatShipmentStatus(event.status)}</p>
                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", getShipmentStatusTone(event.status))}>
                    {index === 0 ? "Última atualização" : "Histórico"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {formatDateTime(event.occurredAt)}
                  {event.substatus ? ` · ${event.substatus}` : ""}
                </p>
                {event.carrierName ? (
                  <p className="mt-2 text-xs font-semibold uppercase text-primary">{event.carrierName}</p>
                ) : null}
                {event.description ? <p className="mt-2 text-sm leading-6 text-foreground">{event.description}</p> : null}
              </div>
            </li>
          ))}
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
    <div className="rounded-md border border-orange-100 bg-orange-50/50 px-3 py-3 dark:border-orange-500/30 dark:bg-orange-950/20">
      <p className="inline-flex items-center text-xs font-bold uppercase text-muted-foreground">
        <Icon className="mr-2 size-3.5" />
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
    UNKNOWN: "Status indisponível"
  };

  return labels[status] ?? "Status indisponível";
}

function getShipmentStatusTone(status: string): string {
  const tones: Record<string, string> = {
    CANCELLED: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200",
    DELAYED: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-500/50 dark:bg-orange-950/30 dark:text-orange-100",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200",
    HANDLING: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-950/30 dark:text-orange-200",
    PENDING: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200",
    READY_TO_SHIP: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-950/30 dark:text-sky-200",
    SHIPPED: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-200",
    UNKNOWN: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/60 dark:text-slate-200"
  };

  return tones[status] ?? tones.UNKNOWN;
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
