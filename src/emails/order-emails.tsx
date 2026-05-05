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
  backgroundColor: emailBrand.colors.background,
  color: emailBrand.colors.ink,
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: 0,
  padding: "28px 12px"
};

const cardStyle: CSSProperties = {
  backgroundColor: emailBrand.colors.card,
  border: `1px solid ${emailBrand.colors.border}`,
  borderRadius: "18px",
  boxShadow: "0 18px 44px rgba(23,32,51,.08)",
  margin: "0 auto",
  maxWidth: "660px",
  overflow: "hidden"
};

const headerStyle: CSSProperties = {
  backgroundColor: emailBrand.colors.ink,
  padding: "22px 28px"
};

const contentStyle: CSSProperties = {
  padding: "30px 28px 8px"
};

const mutedStyle: CSSProperties = {
  color: emailBrand.colors.muted,
  fontSize: "14px",
  lineHeight: "22px"
};

const sectionStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: `1px solid ${emailBrand.colors.border}`,
  borderRadius: "16px",
  margin: "18px 0",
  padding: "18px"
};

const ctaStyle: CSSProperties = {
  backgroundColor: emailBrand.colors.orange,
  borderRadius: "12px",
  boxShadow: "0 10px 22px rgba(255,105,2,.22)",
  color: "#111827",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 800,
  lineHeight: 1,
  padding: "15px 20px",
  textDecoration: "none"
};

export function OrderCreatedEmail({ order }: { order: OrderEmailModel }): ReactElement {
  return (
    <EmailShell
      eyebrow="Pedido recebido"
      preview={`Recebemos seu pedido ${order.orderNumber}.`}
      title={`Recebemos seu pedido ${order.orderNumber}`}
    >
      <p style={mutedStyle}>
        O pagamento está aguardando confirmação. Assim que ele for aprovado, você recebe uma nova atualização.
      </p>
      <OrderSummary order={order} />
      {order.checkoutUrl ? (
        <div style={{ padding: "4px 0 20px" }}>
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
      title="Pagamento aprovado"
    >
      <p style={mutedStyle}>
        Boa notícia: seu pedido {order.orderNumber} entrou na fila de preparação. Vamos avisar quando houver
        rastreamento.
      </p>
      <OrderSummary order={order} />
    </EmailShell>
  );
}

function EmailShell({
  children,
  eyebrow,
  preview,
  title
}: {
  children: ReactNode;
  eyebrow: string;
  preview: string;
  title: string;
}): ReactElement {
  return (
    <html lang="pt-BR">
      <body style={pageStyle}>
        <div style={{ color: "transparent", display: "none", maxHeight: 0, opacity: 0, overflow: "hidden" }}>
          {preview}
        </div>
        <main style={cardStyle}>
          <header style={headerStyle}>
            <table style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element -- E-mail clients need a plain remote image tag. */}
                    <img
                      alt={emailBrand.name}
                      src={getEmailAssetUrl(emailBrand.logoPath)}
                      style={{ border: 0, display: "block", height: "auto", maxWidth: "172px" }}
                      width="172"
                    />
                  </td>
                  <td
                    style={{
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      textAlign: "right",
                      textTransform: "uppercase"
                    }}
                  >
                    {eyebrow}
                  </td>
                </tr>
              </tbody>
            </table>
          </header>
          <section style={contentStyle}>
            <h1 style={{ color: emailBrand.colors.ink, fontSize: "30px", lineHeight: 1.18, margin: 0 }}>
              {title}
            </h1>
            {children}
          </section>
          <footer
            style={{
              backgroundColor: emailBrand.colors.soft,
              borderTop: `1px solid ${emailBrand.colors.border}`,
              color: emailBrand.colors.muted,
              fontSize: "12px",
              lineHeight: 1.55,
              padding: "18px 28px"
            }}
          >
            Mensagem automática da NerdLingoLab. Acompanhe seus pedidos e suporte direto pela sua conta.
          </footer>
        </main>
      </body>
    </html>
  );
}

function OrderSummary({ order }: { order: OrderEmailModel }): ReactElement {
  return (
    <>
      <section style={sectionStyle}>
        <p style={{ margin: "0 0 14px" }}>Olá, {order.customerName}.</p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {order.items.map((item) => (
              <tr key={`${item.title}-${item.variantTitle ?? "default"}`}>
                <td style={{ borderTop: "1px solid #eef1f5", padding: "12px 0" }}>
                  <strong>{item.title}</strong>
                  <br />
                  <span style={mutedStyle}>
                    {item.variantTitle ?? "Padrão"} · qtd. {item.quantity}
                  </span>
                </td>
                <td style={{ borderTop: "1px solid #eef1f5", padding: "12px 0", textAlign: "right" }}>
                  {formatCurrency(item.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section style={sectionStyle}>
        <SummaryRow label="Produtos" value={formatCurrency(order.subtotalCents)} />
        {order.discountCents > 0 ? <SummaryRow label="Descontos" value={`-${formatCurrency(order.discountCents)}`} /> : null}
        <SummaryRow label="Frete" value={order.shippingCents > 0 ? formatCurrency(order.shippingCents) : "Grátis"} />
        <div style={{ borderTop: "1px solid #eef1f5", marginTop: "10px", paddingTop: "12px" }}>
          <SummaryRow emphasis label="Total" value={formatCurrency(order.totalCents)} />
        </div>
        <p style={{ ...mutedStyle, margin: "16px 0 0" }}>Entrega: {order.shippingLabel || "A definir"}</p>
      </section>
    </>
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
