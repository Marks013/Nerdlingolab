import { AdminReviewManager } from "@/features/reviews/components/admin-review-manager";
import { requireAdmin } from "@/lib/admin";
import { getAdminProductReviewDashboard } from "@/lib/reviews/queries";

export const dynamic = "force-dynamic";

export default async function AdminProductReviewsPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const data = await getAdminProductReviewDashboard();

  return (
    <main>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminReviewManager reviews={data.reviews} settings={data.settings} />
      </div>
    </main>
  );
}
