/* eslint-disable @next/next/no-head-element -- React Email renders a standalone document, not a Next.js page. */
import type { CSSProperties, ReactElement, ReactNode } from "react";

import { emailBrand, getEmailAssetUrl } from "@/lib/email/branded-template";
import { formatCurrency } from "@/lib/format";

export interface OrderEmailItem {
  quantity: number;
  title: string;
  totalCents: number;
  variantTitle: string | null;
}

export interface OrderEmailModel {
  checkoutUrl?: string | null;
  customerName: string;
  discountCents: number;
  items: OrderEmailItem[];
  orderNumber: string;
  shippingCents: number;
  shippingLabel: string;
  subtotalCents: number;
  totalCents: number;
}

const pageStyle: CSSProperties = {
  backgroundColor: "#fff7ed",
  color: emailBrand.colors.ink,
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: 0,
  padding: "24px 12px"
};

const cardStyle: CSSProperties = {
  backgroundColor: emailBrand.colors.card,
  border: "1px solid #fed7aa",
  borderRadius: "18px",
  margin: "0 auto",
  maxWidth: "640px",
  overflow: "hidden"
};

const headerStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "18px 24px"
};

const contentStyle: CSSProperties = {
  padding: "22px 24px 8px"
};

const mutedStyle: CSSProperties = {
  color: emailBrand.colors.muted,
  fontSize: "14px",
  lineHeight: "22px"
};

const sectionStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #fed7aa",
  borderRadius: "14px",
  margin: "16px 0",
  padding: "18px"
};

const ctaStyle: CSSProperties = {
  backgroundColor: emailBrand.colors.orange,
  borderRadius: "12px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: 800,
  lineHeight: 1,
  padding: "16px 22px",
  textDecoration: "none"
};

export function OrderCreatedEmail({ order }: { order: OrderEmailModel }): ReactElement {
  return (
    <EmailShell
      eyebrow="Pedido recebido"
      preview={`Recebemos seu pedido ${order.orderNumber}.`}
      stage="created"
      subtitle="Seu pedido entrou no nosso laboratório geek. Agora estamos aguardando a confirmação do pagamento para seguir para a preparação."
      title="Pedido recebido"
    >
      <OrderSummary order={order} />
      {order.checkoutUrl ? (
        <div style={{ padding: "4px 0 22px", textAlign: "center" }}>
          <a href={order.checkoutUrl} style={ctaStyle}>
            Concluir pagamento
          </a>
        </div>
      ) : null}
    </EmailShell>
  );
}

export function OrderPaidEmail({ order }: { order: OrderEmailModel }): ReactElement {
  return (
    <EmailShell
      eyebrow="Pagamento aprovado"
      preview={`Pagamento aprovado do pedido ${order.orderNumber}.`}
      stage="paid"
      subtitle={`Boa notícia: o pedido ${order.orderNumber} entrou na fila de preparação. Vamos avisar quando houver rastreamento.`}
      title="Pagamento aprovado"
    >
      <OrderSummary order={order} />
    </EmailShell>
  );
}

function EmailShell({
  children,
  eyebrow,
  preview,
  stage,
  subtitle,
  title
}: {
  children: ReactNode;
  eyebrow: string;
  preview: string;
  stage: "created" | "paid";
  subtitle: string;
  title: string;
}): ReactElement {
  return (
    <html lang="pt-BR">
      <head>
        <meta content="light only" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
        <style>{`
          :root { color-scheme: light only; supported-color-schemes: light; }
          body, table, td, div, p, a { color-scheme: light only; }
          @media (prefers-color-scheme: dark) {
            .nll-page { background:#fff7ed !important; }
            .nll-card, .nll-panel { background:#ffffff !important; color:#172033 !important; }
            .nll-hero, .nll-footer { background:#172033 !important; color:#ffffff !important; }
            .nll-soft { background:#fffaf5 !important; color:#172033 !important; }
          }
        `}</style>
      </head>
      <body className="nll-page" style={{ ...pageStyle, colorScheme: "light" }}>
        <div style={{ color: "transparent", display: "none", maxHeight: 0, opacity: 0, overflow: "hidden" }}>
          {preview}
        </div>
        <main className="nll-card" style={{ ...cardStyle, colorScheme: "light" }}>
          <div style={{ backgroundColor: emailBrand.colors.orange, color: "#ffffff", colorScheme: "light", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", padding: "10px 24px", textTransform: "uppercase" }}>
            NerdLingoLab · Pedido no radar
          </div>
          <header className="nll-panel" style={{ ...headerStyle, colorScheme: "light" }}>
            <table style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle" }}>
                    <table>
                      <tbody>
                        <tr>
                          <td style={{ paddingRight: "10px", verticalAlign: "middle" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- E-mail clients need a plain remote image tag. */}
                            <img
                              alt=""
                              height="42"
                              src={getEmailAssetUrl(emailBrand.markPath)}
                              style={{ border: 0, borderRadius: "10px", display: "block", height: "42px", width: "42px" }}
                              width="42"
                            />
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <div style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1.15 }}>
                              <span style={{ color: emailBrand.colors.orange }}>Nerd</span>
                              <span style={{ color: emailBrand.colors.violet }}>LingoLab</span>
                            </div>
                            <div style={{ color: emailBrand.colors.muted, fontSize: "12px", lineHeight: 1.35 }}>
                              Loja geek oficial
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                    <span
                      style={{
                        backgroundColor: emailBrand.colors.soft,
                        border: "1px solid #fed7aa",
                        borderRadius: "999px",
                        color: "#9a3412",
                        display: "inline-block",
                        fontSize: "11px",
                        fontWeight: 800,
                        lineHeight: 1,
                        padding: "8px 10px",
                        textTransform: "uppercase"
                      }}
                    >
                      {eyebrow}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </header>
          <section className="nll-hero" style={{ backgroundColor: "#172033", color: "#ffffff", colorScheme: "light", padding: "24px" }}>
            <table style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "16px", verticalAlign: "middle" }}>
                    <div style={{ color: "#fed7aa", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", marginBottom: "10px", textTransform: "uppercase" }}>
                      {eyebrow}
                    </div>
                    <h1 style={{ color: "#ffffff", fontSize: "28px", lineHeight: 1.18, margin: "0 0 10px" }}>
                      {title}
                    </h1>
                    <p style={{ color: "#dbe4f0", fontSize: "15px", lineHeight: "23px", margin: 0 }}>{subtitle}</p>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "middle", width: "86px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- E-mail clients need a plain remote image tag. */}
                    <img
                      alt=""
                      height="72"
                      src={getEmailAssetUrl("/brand-assets/MASCOTE_02_NERDLINGOLAB.webp")}
                      style={{ border: "0", display: "inline-block", height: "72px", width: "72px" }}
                      width="72"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
          <section style={contentStyle}>
            <StatusSteps stage={stage} />
            {children}
          </section>
          <footer
            className="nll-footer"
            style={{
              backgroundColor: "#172033",
              borderTop: "1px solid #263247",
              color: emailBrand.colors.muted,
              fontSize: "12px",
              lineHeight: 1.55,
              padding: "16px 24px"
            }}
          >
            <span style={{ fontWeight: 800 }}>
              <span style={{ color: emailBrand.colors.orange }}>Nerd</span>
              <span style={{ color: "#c084fc" }}>LingoLab</span>
            </span>
            <br />
            <span style={{ color: "#cbd5e1" }}>
              Mensagem automática. Acompanhe pedidos, suporte e Nerdcoins direto pela sua conta.
            </span>
          </footer>
        </main>
      </body>
    </html>
  );
}

function OrderSummary({ order }: { order: OrderEmailModel }): ReactElement {
  return (
    <>
      <section className="nll-panel" style={sectionStyle}>
        <p style={{ color: emailBrand.colors.ink, fontSize: "15px", lineHeight: "23px", margin: "0 0 14px" }}>
          Olá, <strong>{order.customerName}</strong>. Separamos abaixo tudo que chegou para a sua missão.
        </p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {order.items.map((item) => (
              <tr key={`${item.title}-${item.variantTitle ?? "default"}`}>
                <td style={{ borderTop: "1px solid #ffedd5", padding: "12px 0" }}>
                  <strong>{item.title}</strong>
                  <br />
                  <span style={mutedStyle}>
                    {item.variantTitle ?? "Padrão"} · qtd. {item.quantity}
                  </span>
                </td>
                <td style={{ borderTop: "1px solid #ffedd5", fontWeight: 800, padding: "12px 0", textAlign: "right" }}>
                  {formatCurrency(item.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="nll-soft" style={{ ...sectionStyle, backgroundColor: "#fffaf5" }}>
        <SummaryRow label="Produtos" value={formatCurrency(order.subtotalCents)} />
        {order.discountCents > 0 ? <SummaryRow label="Descontos" value={`-${formatCurrency(order.discountCents)}`} /> : null}
        <SummaryRow label="Frete" value={order.shippingCents > 0 ? formatCurrency(order.shippingCents) : "Grátis"} />
        <div style={{ borderTop: "1px solid #fed7aa", marginTop: "10px", paddingTop: "12px" }}>
          <SummaryRow emphasis label="Total" value={formatCurrency(order.totalCents)} />
        </div>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #ffedd5", borderRadius: "12px", marginTop: "14px", padding: "12px" }}>
          <div style={{ color: "#9a3412", fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em", marginBottom: "4px", textTransform: "uppercase" }}>
            Entrega
          </div>
          <div style={{ color: emailBrand.colors.ink, fontSize: "14px", lineHeight: "20px" }}>
            {order.shippingLabel || "A definir"}
          </div>
        </div>
      </section>
    </>
  );
}

function StatusSteps({ stage }: { stage: "created" | "paid" }): ReactElement {
  const paid = stage === "paid";

  return (
    <section className="nll-panel" style={{ ...sectionStyle, backgroundColor: "#ffffff", marginTop: 0 }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr>
            <StepCell active index={1} label="Pedido recebido" />
            <StepCell active={paid} index={2} label="Pagamento" />
            <StepCell active={false} index={3} label="Preparação" />
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function StepCell({ active, index, label }: { active: boolean; index: number; label: string }): ReactElement {
  return (
    <td style={{ textAlign: "center", verticalAlign: "top", width: "33.33%" }}>
      <span
        style={{
          backgroundColor: active ? emailBrand.colors.orange : "#f1f5f9",
          borderRadius: "999px",
          color: active ? "#ffffff" : "#94a3b8",
          display: "inline-block",
          fontSize: "13px",
          fontWeight: 900,
          height: "26px",
          lineHeight: "26px",
          width: "26px"
        }}
      >
        {active ? "✓" : index}
      </span>
      <div
        style={{
          color: active ? emailBrand.colors.ink : emailBrand.colors.muted,
          fontSize: "12px",
          fontWeight: active ? 800 : 700,
          lineHeight: "16px",
          marginTop: "7px"
        }}
      >
        {label}
      </div>
    </td>
  );
}

function SummaryRow({ emphasis, label, value }: { emphasis?: boolean; label: string; value: string }): ReactElement {
  return (
    <table style={{ width: "100%" }}>
      <tbody>
        <tr>
          <td style={{ color: emailBrand.colors.muted, fontSize: emphasis ? "16px" : "14px", padding: "4px 0" }}>
            {label}
          </td>
          <td
            style={{
              color: emailBrand.colors.ink,
              fontSize: emphasis ? "18px" : "14px",
              fontWeight: emphasis ? 800 : 700,
              padding: "4px 0",
              textAlign: "right"
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
