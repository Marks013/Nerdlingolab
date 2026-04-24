const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxImageSizeBytes = 5 * 1024 * 1024;

export function validateProductImage(file: File): void {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Envie uma imagem JPG, PNG, WebP ou GIF.");
  }

  if (file.size > maxImageSizeBytes) {
    throw new Error("A imagem deve ter até 5 MB.");
  }
}

export function validateProductImageBytes(file: File, bytes: Buffer): void {
  const signatures: Record<string, number[]> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
    "image/gif": [0x47, 0x49, 0x46, 0x38]
  };
  const signature = signatures[file.type];
  const isValidSignature = signature?.every((byte, index) => bytes[index] === byte) ?? false;

  if (!isValidSignature) {
    throw new Error("O arquivo não parece ser uma imagem válida.");
  }
}

export function buildProductImageObjectName(file: File): string {
  const extension = getExtensionFromFile(file);
  const now = new Date();
  const datePath = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("/");

  return `products/${datePath}/${crypto.randomUUID()}.${extension}`;
}

function getExtensionFromFile(file: File): string {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}
