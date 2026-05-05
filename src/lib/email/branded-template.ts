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
    border: "#e5e7eb",
    card: "#ffffff",
    ink: "#172033",
    muted: "#667085",
    orange: "#ff6902",
    soft: "#fff7ed",
    violet: "#7c1fe6"
  },
  mascotPath: "/brand-assets/MASCOTE_02_NERDLINGOLAB.webp",
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
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light only; supported-color-schemes: light; }
      body, table, td, div, p, a { color-scheme: light only; }
      @media (prefers-color-scheme: dark) {
        .nll-page { background:#fff7ed !important; }
        .nll-card, .nll-panel { background:#ffffff !important;color:#172033 !important; }
        .nll-hero, .nll-footer { background:#172033 !important;color:#ffffff !important; }
        .nll-soft { background:#fffaf5 !important;color:#172033 !important; }
      }
    </style>
  </head>
  <body class="nll-page" bgcolor="${emailBrand.colors.background}" style="margin:0;background:${emailBrand.colors.background};font-family:Arial,Helvetica,sans-serif;color:${emailBrand.colors.ink};color-scheme:light;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>` : ""}
    <table class="nll-page" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${emailBrand.colors.background}" style="background:${emailBrand.colors.background};padding:24px 12px;color-scheme:light;">
      <tr>
        <td align="center">
          <table class="nll-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${emailBrand.colors.card}" style="max-width:640px;background:${emailBrand.colors.card};border:1px solid #fed7aa;border-radius:18px;overflow:hidden;color-scheme:light;">
            <tr>
              <td bgcolor="${emailBrand.colors.orange}" style="background:${emailBrand.colors.orange};color:#ffffff;font-size:12px;font-weight:800;letter-spacing:0.08em;padding:10px 24px;text-transform:uppercase;color-scheme:light;">
                NerdLingoLab · Comunicacao oficial
              </td>
            </tr>
            <tr>
              <td class="nll-panel" bgcolor="#ffffff" style="background:#ffffff;padding:18px 24px;color-scheme:light;">
                ${buildBrandHeaderHtml(eyebrow)}
              </td>
            </tr>
            <tr>
              <td class="nll-hero" bgcolor="#172033" style="background:#172033;color:#ffffff;padding:24px;color-scheme:light;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:16px;">
                      <div style="color:#fed7aa;font-size:12px;font-weight:800;letter-spacing:0.08em;margin-bottom:10px;text-transform:uppercase;">${escapeHtml(eyebrow ?? "Atualizacao")}</div>
                      <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.2;font-weight:900;">${escapeHtml(title)}</h1>
                      ${introHtml ? `<div style="margin-top:12px;color:#dbe4f0;font-size:15px;line-height:1.6;">${introHtml}</div>` : ""}
                    </td>
                    <td align="right" style="vertical-align:middle;width:86px;">
                      <img src="${getEmailAssetUrl(emailBrand.mascotPath)}" width="72" height="72" alt="" style="display:inline-block;width:72px;height:72px;border:0;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${sections.map((section) => buildSectionHtml(section)).join("")}
            ${cta ? `<tr><td align="center" style="padding:16px 24px 28px;">${buildEmailButton(cta)}</td></tr>` : ""}
            <tr>
              <td class="nll-footer" bgcolor="#172033" style="background:#172033;border-top:1px solid #263247;padding:16px 24px;color:#cbd5e1;font-size:12px;line-height:1.55;color-scheme:light;">
                <strong><span style="color:${emailBrand.colors.orange};">Nerd</span><span style="color:#c084fc;">LingoLab</span></strong><br>
                ${footerNote ? escapeHtml(footerNote) : `Mensagem automatica. Acesse sua conta para acompanhar pedidos, suporte e Nerdcoins.`}
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
                <div style="font-size:18px;line-height:1.15;font-weight:800;"><span style="color:${emailBrand.colors.orange};">Nerd</span><span style="color:${emailBrand.colors.violet};">LingoLab</span></div>
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
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${emailBrand.colors.orange};border-radius:12px;color:#ffffff;font-size:16px;font-weight:900;line-height:1;text-decoration:none;padding:16px 22px;">${escapeHtml(label)}</a>`;
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
  return `<div style="background:${emailBrand.colors.soft};border:1px solid #fed7aa;border-radius:12px;color:${emailBrand.colors.ink};font-size:14px;line-height:1.55;padding:14px 15px;">${escapeHtml(message)}</div>`;
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
        <div class="nll-panel" style="border:1px solid #fed7aa;border-radius:14px;padding:18px;background:#ffffff;color-scheme:light;">
          ${title ? `<h2 style="margin:0 0 12px;color:${emailBrand.colors.ink};font-size:15px;line-height:1.3;font-weight:800;">${escapeHtml(title)}</h2>` : ""}
          ${html}
        </div>
      </td>
    </tr>`;
}
