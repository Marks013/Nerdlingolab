import { render } from "@react-email/render";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
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
  formatMultilineText,
  getEmailBaseUrl
} from "@/lib/email/branded-template";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getAdminOrderById } from "@/lib/orders/queries";
import type { PasswordResetToken } from "@/lib/password-reset";
import { getAppBaseUrl } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const emailFrom = process.env.EMAIL_FROM ?? "NerdLingoLab <no-reply@nerdlingolab.com>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface OrderStatusEmailCopy {
  body: string;
  ctaLabel: string;
  eyebrow: string;
  notice: string;
  previewText: string;
  statusLabel: string;
  subject: string;
  templateKey: string;
  title: string;
}

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

export async function sendOrderStatusUpdatedEmail({
  orderId,
  status
}: {
  orderId: string;
  status: OrderStatus;
}): Promise<void> {
  if (!resend) {
    return;
  }

  const statusCopy = getOrderStatusEmailCopy(status);

  if (!statusCopy) {
    return;
  }

  try {
    const order = await getAdminOrderById(orderId);

    if (!order) {
      return;
    }

    const customerSnapshot = order.customerSnapshot as Record<string, string | undefined>;
    const customerName = order.user?.name ?? customerSnapshot.name ?? order.email;
    const orderUrl = `${getEmailBaseUrl()}/conta/pedidos/${order.id}`;
    const variables = {
      customerName,
      orderNumber: order.orderNumber,
      orderStatus: statusCopy.statusLabel,
      orderTotal: formatCurrency(order.totalCents),
      orderUrl,
      paymentStatus: getPaymentStatusEmailLabel(order.paymentStatus),
      supportEmail: process.env.SUPPORT_EMAIL ?? "nerdlingolab@gmail.com"
    };
    const template = await prismaNotificationTemplate(statusCopy.templateKey);
    const subject = renderNotificationText(template?.subject ?? statusCopy.subject, variables);
    const body = renderNotificationText(template?.body ?? statusCopy.body, variables);
    const ctaHref = resolveEmailHref(renderNotificationText(template?.ctaHref ?? orderUrl, variables));
    const ctaLabel = renderNotificationText(template?.ctaLabel ?? statusCopy.ctaLabel, variables);
    const html = buildBrandedEmailHtml({
      cta: {
        href: ctaHref,
        label: ctaLabel
      },
      eyebrow: statusCopy.eyebrow,
      footerNote: "Você pode acompanhar pedido, rastreio, suporte e benefícios direto pela sua conta.",
      introHtml: `<p style="margin:0;">${formatMultilineText(body)}</p>`,
      preheader: renderNotificationText(template?.previewText ?? statusCopy.previewText, variables),
      sections: [
        {
          html: buildInfoGrid([
            { label: "Pedido", value: order.orderNumber },
            { label: "Situação do pedido", value: statusCopy.statusLabel },
            { label: "Pagamento", value: getPaymentStatusEmailLabel(order.paymentStatus) },
            { label: "Total", value: formatCurrency(order.totalCents) }
          ]),
          title: "Resumo atualizado"
        },
        {
          html: buildNoticeHtml(statusCopy.notice),
          title: "O que acontece agora"
        }
      ],
      title: statusCopy.title
    });

    await resend.emails.send({
      from: emailFrom,
      html,
      subject,
      to: order.email
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}

export async function sendOrderCanceledEmail({
  cancellationReason,
  orderId
}: {
  cancellationReason: string;
  orderId: string;
}): Promise<void> {
  if (!resend) {
    return;
  }

  try {
    const order = await getAdminOrderById(orderId);

    if (!order) {
      return;
    }

    const customerSnapshot = order.customerSnapshot as Record<string, string | undefined>;
    const customerName = order.user?.name ?? customerSnapshot.name ?? order.email;
    const orderUrl = `${getEmailBaseUrl()}/conta/pedidos/${order.id}`;
    const isRefunded = order.paymentStatus === PaymentStatus.REFUNDED || order.status === OrderStatus.REFUNDED;
    const templateKey = isRefunded ? "order_refunded" : "order_canceled";
    const resolutionTitle = isRefunded ? "Pedido reembolsado" : "Pedido cancelado";
    const resolutionStatus = isRefunded ? "Reembolso solicitado" : "Cancelado";
    const refundAmount = order.refundAmountCents ? formatCurrency(order.refundAmountCents) : formatCurrency(order.totalCents);
    const variables = {
      cancellationReason,
      customerName,
      orderNumber: order.orderNumber,
      orderTotal: formatCurrency(order.totalCents),
      orderUrl,
      refundAmount,
      refundStatus: order.refundStatus ?? resolutionStatus,
      resolutionStatus,
      supportEmail: process.env.SUPPORT_EMAIL ?? "nerdlingolab@gmail.com"
    };
    const template = await prismaNotificationTemplate(templateKey);
    const subject = renderNotificationText(
      template?.subject ?? (isRefunded ? "Reembolso do pedido {{orderNumber}} solicitado" : "Pedido {{orderNumber}} cancelado"),
      variables
    );
    const body = renderNotificationText(
      template?.body ??
        (isRefunded
          ? "Olá, {{customerName}}! O pedido {{orderNumber}} foi cancelado e o reembolso foi solicitado pelo Mercado Pago. Justificativa: {{cancellationReason}}"
          : "Olá, {{customerName}}! O pedido {{orderNumber}} foi cancelado. Justificativa: {{cancellationReason}}"),
      variables
    );
    const ctaHref = resolveEmailHref(renderNotificationText(template?.ctaHref ?? orderUrl, variables));
    const ctaLabel = renderNotificationText(template?.ctaLabel ?? "Ver meus pedidos", variables);
    const html = buildBrandedEmailHtml({
      cta: {
        href: ctaHref,
        label: ctaLabel
      },
      eyebrow: isRefunded ? "Cancelamento com reembolso" : "Cancelamento de pedido",
      footerNote: isRefunded
        ? "O Mercado Pago controla o prazo de retorno do valor conforme a forma de pagamento usada."
        : "Se tiver dúvidas sobre o cancelamento, responda este e-mail ou acesse o suporte.",
      introHtml: `<p style="margin:0;">${formatMultilineText(body)}</p>`,
      preheader: renderNotificationText(
        template?.previewText ?? (isRefunded ? "O reembolso foi solicitado pelo Mercado Pago." : "Seu pedido foi cancelado com justificativa da equipe."),
        variables
      ),
      sections: [
        {
          html: buildInfoGrid([
            { label: "Pedido", value: order.orderNumber },
            { label: "Total", value: formatCurrency(order.totalCents) },
            { label: "Situação", value: resolutionStatus },
            ...(isRefunded ? [{ label: "Valor do reembolso", value: refundAmount }] : [])
          ]),
          title: "Resumo do pedido"
        },
        {
          html: buildNoticeHtml(cancellationReason),
          title: "Justificativa"
        }
      ],
      title: `${resolutionTitle}: ${order.orderNumber}`
    });

    await resend.emails.send({
      from: emailFrom,
      html,
      subject,
      to: order.email
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}

function getOrderStatusEmailCopy(status: OrderStatus): OrderStatusEmailCopy | null {
  const map: Partial<Record<OrderStatus, OrderStatusEmailCopy>> = {
    DELIVERED: {
      body: "Olá, {{customerName}}! O pedido {{orderNumber}} foi marcado como entregue. Esperamos que curta muito sua compra.",
      ctaLabel: "Ver pedido",
      eyebrow: "Entrega concluída",
      notice: "Se algo não estiver certo com o produto ou a entrega, abra um atendimento pelo suporte para analisarmos com prioridade.",
      previewText: "A entrega foi concluída. Obrigado por comprar na NerdLingoLab.",
      statusLabel: "Pedido entregue",
      subject: "Pedido {{orderNumber}} entregue",
      templateKey: "order_delivered",
      title: "Seu pedido foi entregue"
    },
    PROCESSING: {
      body: "Olá, {{customerName}}! O pedido {{orderNumber}} já está em preparo. Vamos avisar quando o rastreio estiver disponível.",
      ctaLabel: "Acompanhar pedido",
      eyebrow: "Pedido em preparo",
      notice: "Nossa equipe está conferindo itens, embalagem e próximos passos de envio.",
      previewText: "Seu pedido saiu da fila e já entrou na bancada da equipe.",
      statusLabel: "Em preparo",
      subject: "Pedido {{orderNumber}} em preparo",
      templateKey: "order_processing",
      title: "Pedido em preparo"
    },
    SHIPPED: {
      body: "Boa notícia, {{customerName}}! O pedido {{orderNumber}} foi enviado. Acompanhe o rastreio pela sua conta.",
      ctaLabel: "Ver rastreio",
      eyebrow: "Pedido enviado",
      notice: "O rastreio pode levar algumas horas para exibir novas movimentações na transportadora.",
      previewText: "Seu pedido ganhou rastreio para acompanhamento.",
      statusLabel: "Pedido enviado",
      subject: "Pedido {{orderNumber}} enviado",
      templateKey: "order_shipped",
      title: "Pedido enviado"
    }
  };

  return map[status] ?? null;
}

function getPaymentStatusEmailLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    APPROVED: "Pagamento aprovado",
    CANCELED: "Pagamento cancelado",
    CHARGEBACK: "Pagamento em chargeback",
    PENDING: "Pagamento pendente",
    REFUNDED: "Pagamento reembolsado",
    REJECTED: "Pagamento recusado"
  };

  return labels[status];
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

async function prismaNotificationTemplate(templateKey: string) {
  return prisma.notificationTemplate.findUnique({
    where: { templateKey }
  }).then((template) => template?.isActive ? template : null);
}

function renderNotificationText(value: string, variables: Record<string, string>): string {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? "");
}

function resolveEmailHref(href: string): string {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  return `${getEmailBaseUrl()}${href.startsWith("/") ? href : `/${href}`}`;
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
