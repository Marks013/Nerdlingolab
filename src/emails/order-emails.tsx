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
  padding: "24px 12px"
};

const cardStyle: CSSProperties = {
  backgroundColor: emailBrand.colors.card,
  border: `1px solid ${emailBrand.colors.border}`,
  borderRadius: "12px",
  borderTop: `4px solid ${emailBrand.colors.orange}`,
  margin: "0 auto",
  maxWidth: "620px",
  overflow: "hidden"
};

const headerStyle: CSSProperties = {
  borderBottom: `1px solid ${emailBrand.colors.border}`,
  padding: "20px 24px"
};

const contentStyle: CSSProperties = {
  padding: "26px 24px 6px"
};

const mutedStyle: CSSProperties = {
  color: emailBrand.colors.muted,
  fontSize: "14px",
  lineHeight: "22px"
};

const sectionStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: `1px solid ${emailBrand.colors.border}`,
  borderRadius: "10px",
  margin: "16px 0",
  padding: "16px"
};

const ctaStyle: CSSProperties = {
  backgroundColor: emailBrand.colors.orange,
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 800,
  lineHeight: 1,
  padding: "14px 18px",
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
        <div style={{ padding: "2px 0 20px" }}>
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
                            <div style={{ color: emailBrand.colors.ink, fontSize: "18px", fontWeight: 800, lineHeight: 1.15 }}>
                              NerdLingoLab
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
          <section style={contentStyle}>
            <h1 style={{ color: emailBrand.colors.ink, fontSize: "24px", lineHeight: 1.28, margin: 0 }}>
              {title}
            </h1>
            {children}
          </section>
          <footer
            style={{
              backgroundColor: "#fafafa",
              borderTop: `1px solid ${emailBrand.colors.border}`,
              color: emailBrand.colors.muted,
              fontSize: "12px",
              lineHeight: 1.55,
              padding: "16px 24px"
            }}
          >
            Mensagem automática da NerdLingoLab. Acompanhe pedidos e suporte direto pela sua conta.
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
        <p style={{ margin: "0 0 12px" }}>Olá, {order.customerName}.</p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {order.items.map((item) => (
              <tr key={`${item.title}-${item.variantTitle ?? "default"}`}>
                <td style={{ borderTop: "1px solid #eef1f5", padding: "11px 0" }}>
                  <strong>{item.title}</strong>
                  <br />
                  <span style={mutedStyle}>
                    {item.variantTitle ?? "Padrão"} · qtd. {item.quantity}
                  </span>
                </td>
                <td style={{ borderTop: "1px solid #eef1f5", padding: "11px 0", textAlign: "right" }}>
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
        <div style={{ borderTop: "1px solid #eef1f5", marginTop: "8px", paddingTop: "10px" }}>
          <SummaryRow emphasis label="Total" value={formatCurrency(order.totalCents)} />
        </div>
        <p style={{ ...mutedStyle, margin: "14px 0 0" }}>Entrega: {order.shippingLabel || "A definir"}</p>
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
