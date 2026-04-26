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
  orderNumber: string;
  shippingLabel: string;
  totalCents: number;
  items: OrderEmailItem[];
}

const pageStyle = {
  backgroundColor: "#f6f8fb",
  color: "#172033",
  fontFamily: "Arial, sans-serif",
  padding: "28px"
};

const cardStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #dfe5ee",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "620px",
  padding: "28px"
};

const mutedStyle = {
  color: "#687386",
  fontSize: "14px",
  lineHeight: "22px"
};

export function OrderCreatedEmail({ order }: { order: OrderEmailModel }): React.ReactElement {
  return (
    <html lang="pt-BR">
      <body style={pageStyle}>
        <main style={cardStyle}>
          <h1>Recebemos seu pedido {order.orderNumber}</h1>
          <p style={mutedStyle}>
            O pagamento está aguardando confirmação. Assim que ele for aprovado, você recebe uma nova atualização.
          </p>
          <OrderSummary order={order} />
          {order.checkoutUrl ? (
            <p>
              <a href={order.checkoutUrl}>Concluir pagamento</a>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}

export function OrderPaidEmail({ order }: { order: OrderEmailModel }): React.ReactElement {
  return (
    <html lang="pt-BR">
      <body style={pageStyle}>
        <main style={cardStyle}>
          <h1>Pagamento aprovado</h1>
          <p style={mutedStyle}>
            Seu pedido {order.orderNumber} entrou na fila de preparação. Vamos avisar quando houver rastreamento.
          </p>
          <OrderSummary order={order} />
        </main>
      </body>
    </html>
  );
}

function OrderSummary({ order }: { order: OrderEmailModel }): React.ReactElement {
  return (
    <section>
      <p>Olá, {order.customerName}.</p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {order.items.map((item) => (
            <tr key={`${item.title}-${item.variantTitle ?? "default"}`}>
              <td style={{ borderTop: "1px solid #eef1f5", padding: "10px 0" }}>
                <strong>{item.title}</strong>
                <br />
                <span style={mutedStyle}>
                  {item.variantTitle ?? "Padrão"} · qtd. {item.quantity}
                </span>
              </td>
              <td style={{ borderTop: "1px solid #eef1f5", padding: "10px 0", textAlign: "right" }}>
                {formatCurrency(item.totalCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: "18px", fontWeight: 700, textAlign: "right" }}>
        Total: {formatCurrency(order.totalCents)}
      </p>
      <p style={mutedStyle}>Entrega: {order.shippingLabel}</p>
    </section>
  );
}
