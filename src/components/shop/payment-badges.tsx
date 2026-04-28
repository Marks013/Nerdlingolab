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

export function PaymentBadgeStrip({ compact = false }: { compact?: boolean }): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {acceptedPaymentMethods.map((method) => (
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
    <svg aria-hidden="true" className={compact ? "h-6 w-11" : "h-7 w-14"} viewBox="0 0 78 38">
      <path
        d="M22 6.5a6.2 6.2 0 0 1 4.4 1.8l5.7 5.7a2.8 2.8 0 0 0 4 0l2-2 4.1 4.1-2 2a8.6 8.6 0 0 1-12.2 0l-5.7-5.7a.5.5 0 0 0-.7 0l-8.7 8.7a.5.5 0 0 0 0 .7l8.7 8.7a.5.5 0 0 0 .7 0l3.2-3.2 4.1 4.1-3.2 3.2a6.2 6.2 0 0 1-8.8 0L8.8 25.8a6.3 6.3 0 0 1 0-8.8l8.8-8.7A6.2 6.2 0 0 1 22 6.5Z"
        fill="#32bcad"
      />
      <path
        d="m43 9.2 9.3 9.3a.8.8 0 0 1 0 1.1L43 28.9a6.2 6.2 0 0 1-8.8 0l-3.7-3.7 4.1-4.1 3.7 3.7a.5.5 0 0 0 .7 0l5.7-5.7L39 13.4a.5.5 0 0 0-.7 0l-2.1 2.1-4.1-4.1 2.1-2.1a6.2 6.2 0 0 1 8.8-.1Z"
        fill="#32bcad"
      />
      <text fill="#32bcad" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="900" x="55" y="23">
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
