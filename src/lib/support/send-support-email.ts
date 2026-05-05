import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

import {
  buildBrandedEmailHtml,
  buildInfoGrid,
  escapeHtml,
  formatMultilineText,
  getEmailBaseUrl
} from "@/lib/email/branded-template";
import {
  supportSubjectLabels,
  type SupportRequestInput
} from "@/lib/support/schema";

const emailFrom = process.env.EMAIL_FROM ?? "NerdLingoLab <no-reply@nerdlingolab.com>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const supportEmail = process.env.SUPPORT_EMAIL ?? "nerdlingolab@gmail.com";

export async function sendSupportEmail(input: SupportRequestInput): Promise<{
  error?: string;
  ok: boolean;
  providerMessageId?: string;
  ticketId: string;
}> {
  const ticketId = buildTicketId();

  if (!resend) {
    return {
      error: "Envio de suporte não configurado.",
      ok: false,
      ticketId
    };
  }

  const subjectLabel = supportSubjectLabels[input.subject];

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      html: buildSupportHtml({ input, subjectLabel, ticketId }),
      replyTo: input.email,
      subject: `[${ticketId}] ${subjectLabel}`,
      text: buildSupportText({ input, subjectLabel, ticketId }),
      to: supportEmail
    });

    return {
      ok: true,
      providerMessageId: result.data?.id,
      ticketId
    };
  } catch (error) {
    Sentry.captureException(error);

    return {
      error: error instanceof Error ? error.message : "Não foi possível enviar sua mensagem agora.",
      ok: false,
      ticketId
    };
  }
}

export interface SupportReplyEmailInput {
  adminName: string;
  contactEmail: string;
  contactName: string;
  originalMessage: string;
  replyMessage: string;
  subjectLabel: string;
  ticketId: string;
}

export async function sendSupportReplyEmail(input: SupportReplyEmailInput): Promise<{
  error?: string;
  ok: boolean;
  providerMessageId?: string;
}> {
  if (!resend) {
    return {
      error: "Envio de e-mail não configurado.",
      ok: false
    };
  }

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      html: buildReplyHtml(input),
      replyTo: supportEmail,
      subject: `[${input.ticketId}] Resposta do suporte NerdLingoLab`,
      text: buildReplyText(input),
      to: input.contactEmail
    });

    return {
      ok: true,
      providerMessageId: result.data?.id
    };
  } catch (error) {
    Sentry.captureException(error);

    return {
      error: error instanceof Error ? error.message : "Falha ao enviar resposta por e-mail.",
      ok: false
    };
  }
}

function buildTicketId(): string {
  return `NLL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildSupportText({
  input,
  subjectLabel,
  ticketId
}: {
  input: SupportRequestInput;
  subjectLabel: string;
  ticketId: string;
}): string {
  return [
    `Protocolo: ${ticketId}`,
    `Assunto: ${subjectLabel}`,
    `Nome: ${input.name}`,
    `E-mail: ${input.email}`,
    input.phone ? `Telefone: ${input.phone}` : null,
    "",
    input.message
  ].filter(Boolean).join("\n");
}

function buildSupportHtml({
  input,
  subjectLabel,
  ticketId
}: {
  input: SupportRequestInput;
  subjectLabel: string;
  ticketId: string;
}): string {
  const adminUrl = `${getEmailBaseUrl()}/admin/suporte`;

  return buildBrandedEmailHtml({
    cta: {
      href: adminUrl,
      label: "Abrir painel de suporte"
    },
    eyebrow: "Novo atendimento",
    introHtml: `<p style="margin:0;">Uma nova solicitação chegou pelo formulário de suporte do site.</p>`,
    preheader: `Novo ticket ${ticketId}: ${subjectLabel}.`,
    sections: [
      {
        html: buildInfoGrid([
          { label: "Protocolo", value: ticketId },
          { label: "Assunto", value: subjectLabel },
          { label: "Nome", value: input.name },
          { label: "E-mail", value: input.email },
          { label: "Telefone", value: input.phone ?? "Não informado" }
        ]),
        title: "Dados do cliente"
      },
      {
        html: `<div style="white-space:normal;color:#172033;font-size:14px;line-height:1.65;">${formatMultilineText(input.message)}</div>`,
        title: "Mensagem"
      }
    ],
    title: "Novo ticket de suporte"
  });
}

function buildReplyText(input: SupportReplyEmailInput): string {
  return [
    `Protocolo: ${input.ticketId}`,
    `Assunto: ${input.subjectLabel}`,
    `Resposta enviada por: ${input.adminName}`,
    "",
    input.replyMessage,
    "",
    "Mensagem original:",
    input.originalMessage
  ].join("\n");
}

function buildReplyHtml(input: SupportReplyEmailInput): string {
  return buildBrandedEmailHtml({
    cta: {
      href: `${getEmailBaseUrl()}/suporte`,
      label: "Abrir meu atendimento"
    },
    eyebrow: "Resposta do suporte",
    introHtml: `
      <p style="margin:0 0 10px;">Olá, ${escapeHtml(input.contactName)}.</p>
      <p style="margin:0;">Nossa equipe respondeu seu atendimento. O ticket foi concluído; você pode avaliar ou reabrir pelo histórico de suporte.</p>
    `,
    preheader: `Respondemos seu atendimento ${input.ticketId}.`,
    sections: [
      {
        html: buildInfoGrid([
          { label: "Protocolo", value: input.ticketId },
          { label: "Assunto", value: input.subjectLabel },
          { label: "Respondido por", value: input.adminName }
        ]),
        title: "Resumo"
      },
      {
        html: `<div style="color:#172033;font-size:14px;line-height:1.65;">${formatMultilineText(input.replyMessage)}</div>`,
        title: "Resposta da equipe"
      },
      {
        html: `<div style="border-left:3px solid #fed7aa;color:#667085;font-size:13px;line-height:1.6;padding-left:12px;">${formatMultilineText(input.originalMessage)}</div>`,
        title: "Mensagem original"
      }
    ],
    title: "Respondemos seu atendimento"
  });
}
