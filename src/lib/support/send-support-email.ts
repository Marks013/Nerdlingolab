import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

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
      error: "Envio de suporte nao configurado.",
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
      error: error instanceof Error ? error.message : "Nao foi possivel enviar sua mensagem agora.",
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
  return `
    <div style="font-family:Arial,sans-serif;color:#1c1c1c;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 16px">Contato NerdLingoLab</h1>
      <p><strong>Protocolo:</strong> ${escapeHtml(ticketId)}</p>
      <p><strong>Assunto:</strong> ${escapeHtml(subjectLabel)}</p>
      <p><strong>Nome:</strong> ${escapeHtml(input.name)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(input.email)}</p>
      ${input.phone ? `<p><strong>Telefone:</strong> ${escapeHtml(input.phone)}</p>` : ""}
      <p style="white-space:pre-line;background:#f7f7f7;padding:16px;border-radius:8px">${escapeHtml(input.message)}</p>
    </div>
  `;
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
  return `
    <div style="font-family:Arial,sans-serif;color:#1c1c1c;line-height:1.5">
      <h1 style="font-size:22px;margin:0 0 16px">Resposta do suporte NerdLingoLab</h1>
      <p>Olá, ${escapeHtml(input.contactName)}.</p>
      <p><strong>Protocolo:</strong> ${escapeHtml(input.ticketId)}</p>
      <p><strong>Assunto:</strong> ${escapeHtml(input.subjectLabel)}</p>
      <p style="white-space:pre-line;background:#f7f7f7;padding:16px;border-radius:8px">${escapeHtml(input.replyMessage)}</p>
      <p style="font-size:13px;color:#58636b">Mensagem original:</p>
      <p style="white-space:pre-line;border-left:3px solid #d9e0e4;padding-left:12px;color:#58636b">${escapeHtml(input.originalMessage)}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
