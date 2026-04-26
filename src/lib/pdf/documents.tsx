import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer
} from "@react-pdf/renderer";

import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AdminOrderDetail } from "@/lib/orders/queries";
import type { AdminAnnualReport } from "@/lib/reports/queries";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#172033",
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 32
  },
  header: {
    borderBottomColor: "#d7dce5",
    borderBottomWidth: 1,
    marginBottom: 18,
    paddingBottom: 12
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4
  },
  subtitle: {
    color: "#5d6677",
    fontSize: 10
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8
  },
  row: {
    borderBottomColor: "#eef1f5",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingBottom: 6,
    paddingTop: 6
  },
  col: {
    flex: 1
  },
  right: {
    textAlign: "right"
  },
  muted: {
    color: "#687386"
  },
  total: {
    fontSize: 13,
    fontWeight: 700
  }
});

export async function renderOrderInvoicePdf(order: AdminOrderDetail): Promise<ArrayBuffer> {
  const buffer = await renderToBuffer(<OrderInvoiceDocument order={order} />);

  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function renderAnnualReportPdf(report: AdminAnnualReport): Promise<ArrayBuffer> {
  const buffer = await renderToBuffer(<AnnualReportDocument report={report} />);

  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function OrderInvoiceDocument({ order }: { order: AdminOrderDetail }): React.ReactElement {
  const address = order.shippingAddress as Record<string, string | undefined>;

  return (
    <Document title={`Fatura ${order.orderNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Fatura {order.orderNumber}</Text>
          <Text style={styles.subtitle}>NerdLingoLab · Emitida em {formatDateTime(new Date())}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text>{order.user?.name ?? order.email}</Text>
          <Text style={styles.muted}>{order.user?.email ?? order.email}</Text>
          <Text style={styles.muted}>
            {address.street}, {address.number} · {address.district} · {address.city}/{address.state}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.col}>
                <Text>{item.productTitle}</Text>
                <Text style={styles.muted}>
                  {item.variantTitle ?? "Padrão"} · SKU {item.sku ?? "-"} · qtd. {item.quantity}
                </Text>
              </View>
              <Text style={styles.right}>{formatCurrency(item.totalCents)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totais</Text>
          <PdfMoneyLine label="Subtotal" value={order.subtotalCents} />
          <PdfMoneyLine label="Cupom" value={-order.discountCents} />
          <PdfMoneyLine label="Pontos" value={-order.loyaltyDiscountCents} />
          <PdfMoneyLine label="Frete" value={order.shippingCents} />
          <PdfMoneyLine label="Total" strong value={order.totalCents} />
        </View>
      </Page>
    </Document>
  );
}

function AnnualReportDocument({ report }: { report: AdminAnnualReport }): React.ReactElement {
  return (
    <Document title={`Relatório ${report.filters.startDate} a ${report.filters.endDate}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório comercial</Text>
          <Text style={styles.subtitle}>
            {report.filters.startDate} a {report.filters.endDate}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <PdfMoneyLine label="Receita" strong value={report.totals.revenueCents} />
          <PdfTextLine label="Pedidos pagos" value={String(report.totals.paidOrdersCount)} />
          <PdfMoneyLine
            label="Descontos"
            value={report.totals.couponDiscountCents + report.totals.loyaltyDiscountCents}
          />
          <PdfTextLine label="Pontos emitidos" value={String(report.totals.loyaltyPointsIssued)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meses</Text>
          {report.monthlyItems.map((item) => (
            <View key={item.monthLabel} style={styles.row}>
              <Text style={styles.col}>{item.monthLabel}</Text>
              <Text style={styles.col}>{item.paidOrdersCount} pedido(s)</Text>
              <Text style={[styles.col, styles.right]}>{formatCurrency(item.revenueCents)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

function PdfMoneyLine({
  label,
  value,
  strong = false
}: {
  label: string;
  strong?: boolean;
  value: number;
}): React.ReactElement {
  return <PdfTextLine label={label} strong={strong} value={formatCurrency(value)} />;
}

function PdfTextLine({
  label,
  value,
  strong = false
}: {
  label: string;
  strong?: boolean;
  value: string;
}): React.ReactElement {
  const labelStyle = strong ? [styles.col, styles.total] : styles.col;
  const valueStyle = strong ? [styles.col, styles.right, styles.total] : [styles.col, styles.right];

  return (
    <View style={styles.row}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}
