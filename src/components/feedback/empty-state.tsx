import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateTone = "info" | "success" | "warning" | "loading";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  tone?: EmptyStateTone;
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  loading: Loader2
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  tone = "info"
}: EmptyStateProps): React.ReactElement {
  const Icon = icons[tone];

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="items-center text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className={tone === "loading" ? "h-6 w-6 animate-spin" : "h-6 w-6"} />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {actionHref && actionLabel ? (
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
