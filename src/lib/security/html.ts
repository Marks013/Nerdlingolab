const blockedHtmlTags = "script|style|object|embed|svg|math|form|input|button|base|meta|link";

export function sanitizeRichTextHtml(html: string): string {
  return html
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, sanitizeIframe)
    .replace(new RegExp(`<\\s*(${blockedHtmlTags})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`, "gi"), "")
    .replace(new RegExp(`<\\s*\\/?\\s*(${blockedHtmlTags})\\b[^>]*>`, "gi"), "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])(.*?)\2/gi, (_match, attr: string, quote: string, rawUrl: string) => {
      const normalizedUrl = String(rawUrl).trim();

      return isSafeHtmlUrl(normalizedUrl) ? ` ${attr.toLowerCase()}=${quote}${normalizedUrl}${quote}` : "";
    })
    .replace(/\s+(href|src)\s*=\s*([^\s>]+)/gi, (_match, attr: string, rawUrl: string) => {
      const normalizedUrl = String(rawUrl).trim();

      return isSafeHtmlUrl(normalizedUrl) ? ` ${attr.toLowerCase()}="${normalizedUrl}"` : "";
    });
}

function sanitizeIframe(iframeHtml: string): string {
  const src = getAttributeValue(iframeHtml, "src");

  if (!src || !isTrustedVideoEmbedUrl(src)) {
    return "";
  }

  return `<iframe src="${src}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

function getAttributeValue(html: string, attribute: string): string | null {
  const quotedMatch = html.match(new RegExp(`\\s${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i"));

  if (quotedMatch?.[2]) {
    return quotedMatch[2].trim();
  }

  const unquotedMatch = html.match(new RegExp(`\\s${attribute}\\s*=\\s*([^\\s>]+)`, "i"));

  return unquotedMatch?.[1]?.trim() ?? null;
}

function isTrustedVideoEmbedUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    const host = parsedUrl.hostname.replace(/^www\./, "");

    return parsedUrl.protocol === "https:" && [
      "youtube.com",
      "youtu.be",
      "youtube-nocookie.com",
      "player.vimeo.com",
      "vimeo.com"
    ].includes(host);
  } catch {
    return false;
  }
}

function isSafeHtmlUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}
