import { redirect } from "next/navigation";

export default function PrivacyRedirectPage(): never {
  redirect("/politica-de-privacidade");
}
