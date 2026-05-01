import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Entrar",
  robots: {
    follow: false,
    index: false
  }
};

export default function LoginAliasPage(): never {
  redirect("/conta");
}
