import { LockKeyhole } from "lucide-react";

import { signInWithCredentials } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface AdminLoginPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

function getLoginMessage(error?: string): string | null {
  if (error === "too_many_attempts") {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  if (error) {
    return "Não foi possível entrar. Confira os dados e tente novamente.";
  }

  return null;
}

export default async function AdminLoginPage({
  searchParams
}: AdminLoginPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const loginMessage = getLoginMessage(resolvedSearchParams?.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="fixed right-4 top-4">
        <ThemeToggle compact />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <LockKeyhole className="h-6 w-6 text-primary" />
          <CardTitle>Entrar no admin</CardTitle>
          <CardDescription>Acesso restrito aos operadores NerdLingoLab.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInWithCredentials} className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              E-mail
              <Input name="email" type="email" autoComplete="email" required />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Senha
              <Input name="password" type="password" autoComplete="current-password" required />
            </label>
            <Button className="w-full" type="submit">
              Entrar
            </Button>
            {loginMessage ? <p className="text-sm text-muted-foreground">{loginMessage}</p> : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
