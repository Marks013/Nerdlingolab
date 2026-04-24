export function generateOrderNumber(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `NLL-${datePart}-${randomPart}`;
}
