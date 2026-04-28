import path from "node:path";

import sharp from "sharp";

export const webpMimeType = "image/webp";
const webpQuality = 84;

export interface WebpImageOutput {
  bytes: Buffer;
  fileName: string;
  height: number | null;
  mimeType: typeof webpMimeType;
  width: number | null;
}

export async function convertImageToWebp(input: Buffer, fileName: string): Promise<WebpImageOutput> {
  const image = sharp(input, {
    animated: true,
    failOn: "none"
  }).rotate();
  const metadata = await image.metadata();
  const { data, info } = await image
    .webp({
      effort: 5,
      quality: webpQuality
    })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: data,
    fileName: withWebpExtension(fileName),
    height: info.height ?? metadata.height ?? null,
    mimeType: webpMimeType,
    width: info.width ?? metadata.width ?? null
  };
}

export function withWebpExtension(fileName: string): string {
  const parsedName = path.parse(fileName || "imagem");
  const safeBaseName = parsedName.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "imagem";

  return `${safeBaseName}.webp`;
}
