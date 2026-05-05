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
    background: "#fff7ed",
    border: "#fed7aa",
    card: "#ffffff",
    cyan: "#17bfd0",
    ink: "#172033",
    muted: "#667085",
    orange: "#ff6902",
    soft: "#fff3e8",
    violet: "#7c1fe6"
  },
  logoPath: "/brand-assets/logo.webp",
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
  const logoUrl = getEmailAssetUrl(emailBrand.logoPath);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:${emailBrand.colors.background};font-family:Arial,Helvetica,sans-serif;color:${emailBrand.colors.ink};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>` : ""}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${emailBrand.colors.background};padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:${emailBrand.colors.card};border:1px solid ${emailBrand.colors.border};border-radius:18px;overflow:hidden;box-shadow:0 18px 44px rgba(23,32,51,.08);">
            <tr>
              <td style="background:${emailBrand.colors.ink};padding:22px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <img src="${logoUrl}" width="172" alt="${emailBrand.name}" style="display:block;max-width:172px;height:auto;border:0;">
                    </td>
                    <td align="right" style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffffff;">
                      ${escapeHtml(eyebrow ?? emailBrand.name)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 8px;">
                <h1 style="margin:0;color:${emailBrand.colors.ink};font-size:30px;line-height:1.18;font-weight:800;">${escapeHtml(title)}</h1>
                ${introHtml ? `<div style="margin-top:16px;color:${emailBrand.colors.muted};font-size:15px;line-height:1.65;">${introHtml}</div>` : ""}
              </td>
            </tr>
            ${sections.map((section) => buildSectionHtml(section)).join("")}
            ${cta ? `<tr><td style="padding:18px 28px 28px;">${buildEmailButton(cta)}</td></tr>` : ""}
            <tr>
              <td style="background:${emailBrand.colors.soft};border-top:1px solid ${emailBrand.colors.border};padding:18px 28px;color:${emailBrand.colors.muted};font-size:12px;line-height:1.55;">
                ${footerNote ? escapeHtml(footerNote) : `Mensagem automática da ${emailBrand.name}. Se precisar de ajuda, responda pelo suporte do site.`}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildEmailButton({ href, label }: BrandedEmailCta): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${emailBrand.colors.orange};border-radius:12px;color:#111827;font-size:15px;font-weight:800;line-height:1;text-decoration:none;padding:15px 20px;box-shadow:0 10px 22px rgba(255,105,2,.22);">${escapeHtml(label)}</a>`;
}

export function buildInfoGrid(items: BrandedEmailMetaItem[]): string {
  const rows = items
    .filter((item) => item.value.trim().length > 0)
    .map((item) => `
      <tr>
        <td style="padding:9px 0;color:${emailBrand.colors.muted};font-size:13px;">${escapeHtml(item.label)}</td>
        <td align="right" style="padding:9px 0;color:${emailBrand.colors.ink};font-size:13px;font-weight:700;">${escapeHtml(item.value)}</td>
      </tr>
    `)
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table>`;
}

export function buildNoticeHtml(message: string): string {
  return `<div style="background:${emailBrand.colors.soft};border:1px solid ${emailBrand.colors.border};border-radius:14px;color:${emailBrand.colors.ink};font-size:14px;line-height:1.55;padding:14px 16px;">${escapeHtml(message)}</div>`;
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
      <td style="padding:14px 28px;">
        <div style="border:1px solid ${emailBrand.colors.border};border-radius:16px;padding:18px;background:#ffffff;">
          ${title ? `<h2 style="margin:0 0 14px;color:${emailBrand.colors.ink};font-size:16px;line-height:1.3;font-weight:800;">${escapeHtml(title)}</h2>` : ""}
          ${html}
        </div>
      </td>
    </tr>`;
}
