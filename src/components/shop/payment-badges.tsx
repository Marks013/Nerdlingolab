export const acceptedPaymentMethods = [
  { id: "mastercard", label: "Mastercard", Logo: MastercardLogo },
  { id: "visa", label: "Visa", Logo: VisaLogo },
  { id: "elo", label: "Elo", Logo: EloLogo },
  { id: "hipercard", label: "Hipercard", Logo: HipercardLogo },
  { id: "amex", label: "American Express", Logo: AmexLogo },
  { id: "diners", label: "Diners Club", Logo: DinersLogo },
  { id: "boleto", label: "Boleto", Logo: BoletoLogo },
  { id: "pix", label: "Pix", Logo: PixLogo }
] as const;

export const pixPaymentMethod = acceptedPaymentMethods.find((method) => method.id === "pix") ?? acceptedPaymentMethods[0];

export function PaymentBadge({
  compact = false,
  method
}: {
  compact?: boolean;
  method: (typeof acceptedPaymentMethods)[number];
}): React.ReactElement {
  return (
    <span
      aria-label={method.label}
      className={[
        "payment-badge inline-flex items-center justify-center overflow-hidden rounded-md border border-[#d9e0e4] bg-white shadow-sm",
        compact ? "h-8 w-[58px] px-1.5" : "h-10 w-[78px] px-2"
      ].join(" ")}
      role="img"
      title={method.label}
    >
      <method.Logo compact={compact} />
    </span>
  );
}

export function PaymentBadgeStrip({
  compact = false,
  includePix = true
}: {
  compact?: boolean;
  includePix?: boolean;
}): React.ReactElement {
  const methods = includePix
    ? acceptedPaymentMethods
    : acceptedPaymentMethods.filter((method) => method.id !== "pix");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {methods.map((method) => (
        <PaymentBadge compact={compact} key={method.id} method={method} />
      ))}
    </div>
  );
}

function MastercardLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return (
    <svg aria-hidden="true" className={compact ? "h-6 w-10" : "h-7 w-12"} viewBox="0 0 64 40">
      <circle cx="26" cy="20" fill="#eb001b" r="13" />
      <circle cx="38" cy="20" fill="#f79e1b" r="13" />
      <path d="M32 9.2a13 13 0 0 1 0 21.6 13 13 0 0 1 0-21.6Z" fill="#ff5f00" />
    </svg>
  );
}

function VisaLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return (
    <svg aria-hidden="true" className={compact ? "h-5 w-11" : "h-6 w-14"} viewBox="0 0 96 32">
      <text
        fill="#1434cb"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="22"
        fontStyle="italic"
        fontWeight="900"
        x="11"
        y="23"
      >
        VISA
      </text>
    </svg>
  );
}

function EloLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return <PaymentWordmark compact={compact} color="#111827" label="elo" />;
}

function HipercardLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return <PaymentWordmark compact={compact} color="#c51f32" label="Hipercard" />;
}

function AmexLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return <PaymentWordmark compact={compact} color="#0072ce" label="AMEX" />;
}

function DinersLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return <PaymentWordmark compact={compact} color="#0079be" label="Diners" />;
}

function BoletoLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return (
    <svg aria-hidden="true" className={compact ? "h-6 w-11" : "h-7 w-12"} viewBox="0 0 64 36">
      <path d="M8 5h2v18H8zm5 0h1v18h-1zm4 0h3v18h-3zm7 0h1v18h-1zm4 0h2v18h-2zm6 0h1v18h-1zm4 0h4v18h-4zm8 0h1v18h-1zm4 0h2v18h-2zm6 0h1v18h-1z" fill="#111827" />
      <text fill="#111827" fontFamily="Arial, Helvetica, sans-serif" fontSize="7" fontWeight="700" x="10" y="32">
        Boleto
      </text>
    </svg>
  );
}

function PixLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return (
    <svg aria-hidden="true" className={compact ? "h-6 w-12" : "h-7 w-14"} viewBox="0 0 84 40">
      <g fill="none" stroke="#32bcad" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4">
        <path d="M13 20 23 10a4 4 0 0 1 5.7 0l6 6a4.2 4.2 0 0 0 6 0l3.3-3.3" />
        <path d="m44 27.3-3.3-3.3a4.2 4.2 0 0 0-6 0l-6 6a4 4 0 0 1-5.7 0L13 20" />
        <path d="m44 12.7 6.2 6.2a1.6 1.6 0 0 1 0 2.2L44 27.3" />
      </g>
      <text fill="#32bcad" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="900" x="56" y="24">
        Pix
      </text>
    </svg>
  );
}

function PaymentWordmark({
  color,
  compact = false,
  label
}: {
  color: string;
  compact?: boolean;
  label: string;
}): React.ReactElement {
  return (
    <svg aria-hidden="true" className={compact ? "h-5 w-11" : "h-6 w-14"} viewBox="0 0 72 32">
      <text
        fill={color}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={label.length > 6 ? 10 : 15}
        fontStyle={label === "elo" ? "italic" : "normal"}
        fontWeight="900"
        textAnchor="middle"
        x="36"
        y="21"
      >
        {label}
      </text>
    </svg>
  );
}
