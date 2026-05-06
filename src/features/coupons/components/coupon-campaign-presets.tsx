"use client";

import { CalendarDays, Flame, Percent, TicketPercent, Truck, Zap } from "lucide-react";
import { useState } from "react";

interface CouponCampaignPresetsProps {
  compact?: boolean;
}

type CouponPresetType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

interface CampaignPreset {
  codePrefix: string;
  description: string;
  expiresInDays: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  maxDiscount?: string;
  minSubtotal: string;
  perCustomerLimit: string;
  type: CouponPresetType;
  usageLimit: string;
  value: string;
}

const campaignPresets: CampaignPreset[] = [
  {
    codePrefix: "BLACKNERD",
    description: "Campanha escura, agressiva e ideal para alto apelo comercial.",
    expiresInDays: 7,
    icon: Flame,
    label: "Black Friday",
    maxDiscount: "80,00",
    minSubtotal: "99,90",
    perCustomerLimit: "1",
    type: "PERCENTAGE",
    usageLimit: "300",
    value: "25"
  },
  {
    codePrefix: "CONSUMIDOR",
    description: "Vantagem clara para datas de confiança e relacionamento.",
    expiresInDays: 5,
    icon: Percent,
    label: "Dia do Consumidor",
    maxDiscount: "50,00",
    minSubtotal: "79,90",
    perCustomerLimit: "1",
    type: "PERCENTAGE",
    usageLimit: "200",
    value: "15"
  },
  {
    codePrefix: "FRETEGRATIS",
    description: "Remove a principal objeção do carrinho quando a margem permite.",
    expiresInDays: 10,
    icon: Truck,
    label: "Frete grátis",
    minSubtotal: "149,90",
    perCustomerLimit: "1",
    type: "FREE_SHIPPING",
    usageLimit: "150",
    value: "0"
  },
  {
    codePrefix: "FLASH",
    description: "Ação curta para vitrines relâmpago e queima de estoque.",
    expiresInDays: 2,
    icon: Zap,
    label: "Oferta relâmpago",
    maxDiscount: "30,00",
    minSubtotal: "59,90",
    perCustomerLimit: "1",
    type: "FIXED_AMOUNT",
    usageLimit: "80",
    value: "20,00"
  }
];

export function CouponCampaignPresets({ compact = false }: CouponCampaignPresetsProps): React.ReactElement {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  function applyPreset(preset: CampaignPreset, event: React.MouseEvent<HTMLButtonElement>): void {
    const form = event.currentTarget.closest("form");

    if (!form) {
      return;
    }

    setInputValue(form, "code", `${preset.codePrefix}${new Date().getFullYear()}`);
    setInputValue(form, "type", preset.type);
    setInputValue(form, "value", preset.value);
    setInputValue(form, "minSubtotal", preset.minSubtotal);
    setInputValue(form, "maxDiscount", preset.maxDiscount ?? "");
    setInputValue(form, "usageLimit", preset.usageLimit);
    setInputValue(form, "perCustomerLimit", preset.perCustomerLimit);
    setInputValue(form, "startsAt", toDateTimeLocal(new Date()));
    setInputValue(form, "expiresAt", toDateTimeLocal(addDays(new Date(), preset.expiresInDays)));
    setCheckboxValue(form, "isActive", true);
    setCheckboxValue(form, "isPublic", true);
    setCheckboxValue(form, "showOnOffers", true);
    setSelectedLabel(preset.label);
  }

  return (
    <section className="grid gap-3 rounded-lg border border-orange-100 bg-[#fff7ed] p-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-black uppercase text-primary">
          <TicketPercent className="size-4" />
          Presets de campanha
        </p>
        <p className="mt-1 text-pretty text-xs leading-5 text-[#4f5d65]">
          Escolha uma campanha base e ajuste valores antes de salvar.
        </p>
      </div>
      <div className={compact ? "grid gap-2" : "grid gap-2 sm:grid-cols-2"}>
        {campaignPresets.map((preset) => (
          <button
            className="rounded-lg border border-orange-100 bg-white p-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            key={preset.codePrefix}
            onClick={(event) => applyPreset(preset, event)}
            type="button"
          >
            <span className="flex items-center gap-2 font-black text-black">
              <preset.icon className="size-4 text-primary" />
              {preset.label}
            </span>
            <span className="mt-1 block text-pretty text-xs leading-5 text-[#4f5d65]">{preset.description}</span>
          </button>
        ))}
      </div>
      {selectedLabel ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          <CalendarDays className="size-4" />
          Preset aplicado: {selectedLabel}. Revise datas, valores e limites.
        </p>
      ) : null}
    </section>
  );
}

function setInputValue(form: HTMLFormElement, name: string, value: string): void {
  const field = form.elements.namedItem(name);

  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
    field.value = value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function setCheckboxValue(form: HTMLFormElement, name: string, checked: boolean): void {
  const field = form.elements.namedItem(name);

  if (field instanceof HTMLInputElement) {
    field.checked = checked;
  }
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function toDateTimeLocal(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
}
