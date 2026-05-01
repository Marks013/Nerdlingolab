import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CustomerOrderDetail } from "@/features/account/components/customer-order-detail";
import { auth } from "@/lib/auth";
import { getCustomerOrderById } from "@/lib/orders/queries";
import { formatReviewReward } from "@/lib/reviews/rewards";
import { getProductReviewSettings } from "@/lib/reviews/settings";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Detalhes do pedido"
};

export const dynamic = "force-dynamic";

interface CustomerOrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerOrderPage({
  params
}: CustomerOrderPageProps): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { id } = await params;
  const [order, reviewSettings] = await Promise.all([
    getCustomerOrderById({
      orderId: id,
      userId: session.user.id
    }),
    getProductReviewSettings()
  ]);

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <CustomerOrderDetail
        order={order}
        reviewRewardLabel={formatReviewReward(reviewSettings)}
        reviewSettings={reviewSettings}
      />
    </main>
  );
}
