import { render } from "@react-email/render";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

import {
  OrderCreatedEmail,
  OrderPaidEmail,
  type OrderEmailModel
} from "@/emails/order-emails";
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
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h1 style="color:#ff6902">Redefina sua senha NerdLingoLab</h1>
        <p>Olá${resetToken.name ? `, ${resetToken.name}` : ""}! Recebemos uma solicitação para recriar sua senha.</p>
        <p>Este link expira em 45 minutos. Se você não solicitou, ignore esta mensagem.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#ff6902;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
            Criar nova senha
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280">Também é possível copiar este link no navegador:<br>${resetUrl}</p>
      </div>
    `;

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
    const adminUrl = `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/admin/pedidos/${orderId}#rastreamento`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h1 style="color:#ff6902">Pedido com entrega em atraso</h1>
        <p>O pedido <strong>${escapeHtml(orderNumber)}</strong> passou do prazo estimado de entrega.</p>
        <p><strong>Transportadora:</strong> ${escapeHtml(carrierName ?? "Nao informada")}<br>
        <strong>Codigo:</strong> ${escapeHtml(trackingNumber ?? "Nao informado")}<br>
        <strong>Prazo:</strong> ${estimatedDeliveryAt.toLocaleString("pt-BR")}</p>
        <p>
          <a href="${adminUrl}" style="display:inline-block;background:#ff6902;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
            Abrir rastreamento
          </a>
        </p>
      </div>
    `;

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

  return {
    customerName: order.user?.name ?? customerSnapshot.name ?? order.email,
    items: order.items.map((item) => ({
      quantity: item.quantity,
      title: item.productTitle,
      totalCents: item.totalCents,
      variantTitle: item.variantTitle
    })),
    orderNumber: order.orderNumber,
    shippingLabel: [
      order.shippingServiceName,
      shippingAddress.city && shippingAddress.state ? `${shippingAddress.city}/${shippingAddress.state}` : null
    ].filter(Boolean).join(" · "),
    totalCents: order.totalCents
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
