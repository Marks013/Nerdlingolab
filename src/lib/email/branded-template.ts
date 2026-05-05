export interface BrandedEmailCta {
  href: string;
  label: string;
}

export interface BrandedEmailMetaItem {
  label: string;
  value: string;
}

export interface BrandedEmailSection {
  html: string;
  title?: string;
}

export interface BrandedEmailOptions {
  cta?: BrandedEmailCta;
  eyebrow?: string;
  footerNote?: string;
  introHtml?: string;
  preheader?: string;
  sections?: BrandedEmailSection[];
  title: string;
}

export const emailBrand = {
  colors: {
    background: "#f5f6f8",
    border: "#e5e7eb",
    card: "#ffffff",
    ink: "#172033",
    muted: "#667085",
    orange: "#ff6902",
    soft: "#fff7ed",
    violet: "#7c1fe6"
  },
  markPath: "/brand-assets/FAVICON_NERDLINGOLAB.webp",
  name: "NerdLingoLab"
};

export function getEmailBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://nerdlingolab.com").replace(/\/$/, "");
}

export function getEmailAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${getEmailBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildBrandedEmailHtml({
  cta,
  eyebrow,
  footerNote,
  introHtml,
  preheader,
  sections = [],
  title
}: BrandedEmailOptions): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:${emailBrand.colors.background};font-family:Arial,Helvetica,sans-serif;color:${emailBrand.colors.ink};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>` : ""}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${emailBrand.colors.background};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:${emailBrand.colors.card};border:1px solid ${emailBrand.colors.border};border-top:4px solid ${emailBrand.colors.orange};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid ${emailBrand.colors.border};">
                ${buildBrandHeaderHtml(eyebrow)}
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px 6px;">
                <h1 style="margin:0;color:${emailBrand.colors.ink};font-size:24px;line-height:1.28;font-weight:800;">${escapeHtml(title)}</h1>
                ${introHtml ? `<div style="margin-top:14px;color:${emailBrand.colors.muted};font-size:15px;line-height:1.6;">${introHtml}</div>` : ""}
              </td>
            </tr>
            ${sections.map((section) => buildSectionHtml(section)).join("")}
            ${cta ? `<tr><td style="padding:16px 24px 28px;">${buildEmailButton(cta)}</td></tr>` : ""}
            <tr>
              <td style="background:#fafafa;border-top:1px solid ${emailBrand.colors.border};padding:16px 24px;color:${emailBrand.colors.muted};font-size:12px;line-height:1.55;">
                ${footerNote ? escapeHtml(footerNote) : `Mensagem automática da ${emailBrand.name}. Acesse sua conta para acompanhar pedidos e suporte.`}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildBrandHeaderHtml(eyebrow?: string): string {
  const markUrl = getEmailAssetUrl(emailBrand.markPath);

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="vertical-align:middle;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <img src="${markUrl}" width="42" height="42" alt="" style="display:block;width:42px;height:42px;border:0;border-radius:10px;">
              </td>
              <td style="vertical-align:middle;">
                <div style="font-size:18px;line-height:1.15;font-weight:800;color:${emailBrand.colors.ink};">${emailBrand.name}</div>
                <div style="font-size:12px;line-height:1.35;color:${emailBrand.colors.muted};">Loja geek oficial</div>
              </td>
            </tr>
          </table>
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="display:inline-block;background:${emailBrand.colors.soft};border:1px solid #fed7aa;border-radius:999px;color:#9a3412;font-size:11px;font-weight:800;line-height:1;padding:8px 10px;text-transform:uppercase;">
            ${escapeHtml(eyebrow ?? "Atualização")}
          </span>
        </td>
      </tr>
    </table>`;
}

export function buildEmailButton({ href, label }: BrandedEmailCta): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${emailBrand.colors.orange};border-radius:8px;color:#ffffff;font-size:15px;font-weight:800;line-height:1;text-decoration:none;padding:14px 18px;">${escapeHtml(label)}</a>`;
}

export function buildInfoGrid(items: BrandedEmailMetaItem[]): string {
  const rows = items
    .filter((item) => item.value.trim().length > 0)
    .map((item) => `
      <tr>
        <td style="padding:8px 0;color:${emailBrand.colors.muted};font-size:13px;">${escapeHtml(item.label)}</td>
        <td align="right" style="padding:8px 0;color:${emailBrand.colors.ink};font-size:13px;font-weight:700;">${escapeHtml(item.value)}</td>
      </tr>
    `)
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table>`;
}

export function buildNoticeHtml(message: string): string {
  return `<div style="background:${emailBrand.colors.soft};border:1px solid #fed7aa;border-radius:10px;color:${emailBrand.colors.ink};font-size:14px;line-height:1.55;padding:13px 14px;">${escapeHtml(message)}</div>`;
}

export function formatMultilineText(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSectionHtml({ html, title }: BrandedEmailSection): string {
  return `
    <tr>
      <td style="padding:12px 24px;">
        <div style="border:1px solid ${emailBrand.colors.border};border-radius:10px;padding:16px;background:#ffffff;">
          ${title ? `<h2 style="margin:0 0 12px;color:${emailBrand.colors.ink};font-size:15px;line-height:1.3;font-weight:800;">${escapeHtml(title)}</h2>` : ""}
          ${html}
        </div>
      </td>
    </tr>`;
}
