import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

import {
  supportSubjectLabels,
  type SupportRequestInput
} from "@/lib/support/schema";

const emailFrom = process.env.EMAIL_FROM ?? "NerdLingoLab <no-reply@nerdlingolab.com>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const supportEmail = process.env.SUPPORT_EMAIL ?? "nerdlingolab@gmail.com";

export async function sendSupportEmail(input: SupportRequestInput): Promise<{ ticketId: string }> {
  if (!resend) {
    throw new Error("O envio de suporte nao esta configurado.");
  }

  const ticketId = buildTicketId();
  const subjectLabel = supportSubjectLabels[input.subject];

  try {
    await resend.emails.send({
      from: emailFrom,
      html: buildSupportHtml({ input, subjectLabel, ticketId }),
      replyTo: input.email,
      subject: `[${ticketId}] ${subjectLabel}`,
      text: buildSupportText({ input, subjectLabel, ticketId }),
      to: supportEmail
    });

    return { ticketId };
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("Nao foi possivel enviar sua mensagem agora. Tente novamente em alguns minutos.");
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
