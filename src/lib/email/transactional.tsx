import { render } from "@react-email/render";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

import {
  OrderCreatedEmail,
  OrderPaidEmail,
  type OrderEmailModel
} from "@/emails/order-emails";
import {
  buildBrandedEmailHtml,
  buildInfoGrid,
  buildNoticeHtml,
  escapeHtml,
  getEmailBaseUrl
} from "@/lib/email/branded-template";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getAdminOrderById } from "@/lib/orders/queries";
import type { PasswordResetToken } from "@/lib/password-reset";
import { getAppBaseUrl } from "@/lib/password-reset";

const emailFrom = process.env.EMAIL_FROM ?? "NerdLingoLab <no-reply@nerdlingolab.com>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendOrderCreatedEmail({
  checkoutUrl,
  orderId
}: {
  checkoutUrl?: string | null;
  orderId: string;
}): Promise<void> {
  await sendOrderEmail({
    buildHtml: (order) => render(<OrderCreatedEmail order={{ ...order, checkoutUrl }} />),
    orderId,
    subjectPrefix: "Pedido recebido"
  });
}

export async function sendOrderPaidEmail(orderId: string): Promise<void> {
  await sendOrderEmail({
    buildHtml: (order) => render(<OrderPaidEmail order={order} />),
    orderId,
    subjectPrefix: "Pagamento aprovado"
  });
}

export async function sendPasswordResetEmail(resetToken: PasswordResetToken, baseUrl = getAppBaseUrl()): Promise<void> {
  if (!resend) {
    return;
  }

  try {
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/redefinir-senha?u=${encodeURIComponent(resetToken.userId)}&token=${encodeURIComponent(resetToken.token)}`;
    const html = buildBrandedEmailHtml({
      cta: {
        href: resetUrl,
        label: "Criar nova senha"
      },
      eyebrow: "Segurança da conta",
      footerNote: "Se você não solicitou a redefinição, ignore esta mensagem. O link expira em 45 minutos.",
      introHtml: `
        <p style="margin:0 0 10px;">Olá${resetToken.name ? `, ${escapeHtml(resetToken.name)}` : ""}.</p>
        <p style="margin:0;">Recebemos uma solicitação para recriar sua senha. Use o botão abaixo para continuar com segurança.</p>
      `,
      preheader: "Use o link seguro para criar uma nova senha.",
      sections: [
        {
          html: buildNoticeHtml(`Link válido até ${formatDateTime(resetToken.expires)}.`),
          title: "Validade do acesso"
        },
        {
          html: `<p style="margin:0;color:#667085;font-size:13px;line-height:1.6;">Se o botão não abrir, copie este endereço no navegador:<br>${escapeHtml(resetUrl)}</p>`,
          title: "Link alternativo"
        }
      ],
      title: "Redefina sua senha"
    });

    await resend.emails.send({
      from: emailFrom,
      html,
      subject: "Redefinição de senha NerdLingoLab",
      to: resetToken.email
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}

export async function sendShipmentOverdueAdminEmail({
  carrierName,
  estimatedDeliveryAt,
  orderId,
  orderNumber,
  trackingNumber
}: {
  carrierName?: string | null;
  estimatedDeliveryAt: Date;
  orderId: string;
  orderNumber: string;
  trackingNumber?: string | null;
}): Promise<void> {
  if (!resend) {
    return;
  }

  try {
    const adminUrl = `${getEmailBaseUrl()}/admin/pedidos/${orderId}#rastreamento`;
    const html = buildBrandedEmailHtml({
      cta: {
        href: adminUrl,
        label: "Abrir rastreamento"
      },
      eyebrow: "Alerta operacional",
      introHtml: `<p style="margin:0;">O pedido <strong>${escapeHtml(orderNumber)}</strong> passou do prazo estimado de entrega e precisa de conferência.</p>`,
      preheader: `Entrega em atraso do pedido ${orderNumber}.`,
      sections: [
        {
          html: buildInfoGrid([
            { label: "Pedido", value: orderNumber },
            { label: "Transportadora", value: carrierName ?? "Não informada" },
            { label: "Código", value: trackingNumber ?? "Não informado" },
            { label: "Prazo estimado", value: estimatedDeliveryAt.toLocaleString("pt-BR") }
          ]),
          title: "Dados do envio"
        }
      ],
      title: "Pedido com entrega em atraso"
    });

    await resend.emails.send({
      from: emailFrom,
      html,
      subject: `Entrega em atraso · ${orderNumber}`,
      to: process.env.SUPPORT_EMAIL ?? "nerdlingolab@gmail.com"
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}

async function sendOrderEmail({
  buildHtml,
  orderId,
  subjectPrefix
}: {
  buildHtml: (order: OrderEmailModel) => Promise<string>;
  orderId: string;
  subjectPrefix: string;
}): Promise<void> {
  if (!resend) {
    return;
  }

  try {
    const order = await getAdminOrderById(orderId);

    if (!order) {
      return;
    }

    const emailOrder = mapOrderToEmailModel(order);
    const html = await buildHtml(emailOrder);

    await resend.emails.send({
      from: emailFrom,
      html,
      subject: `${subjectPrefix} · ${order.orderNumber}`,
      to: order.email
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}

function mapOrderToEmailModel(order: NonNullable<Awaited<ReturnType<typeof getAdminOrderById>>>): OrderEmailModel {
  const customerSnapshot = order.customerSnapshot as Record<string, string | undefined>;
  const shippingAddress = order.shippingAddress as Record<string, string | undefined>;
  const totalDiscountCents = order.discountCents + order.loyaltyDiscountCents;

  return {
    customerName: order.user?.name ?? customerSnapshot.name ?? order.email,
    discountCents: totalDiscountCents,
    items: order.items.map((item) => ({
      quantity: item.quantity,
      title: item.productTitle,
      totalCents: item.totalCents,
      variantTitle: item.variantTitle
    })),
    orderNumber: order.orderNumber,
    shippingCents: order.shippingCents,
    shippingLabel: [
      order.shippingServiceName,
      shippingAddress.city && shippingAddress.state ? `${shippingAddress.city}/${shippingAddress.state}` : null
    ].filter(Boolean).join(" · "),
    subtotalCents: order.subtotalCents,
    totalCents: order.totalCents
  };
}
