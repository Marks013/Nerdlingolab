import { CouponManager } from "@/features/coupons/components/coupon-manager";
import { requireAdmin } from "@/lib/admin";
import { getAdminCoupons } from "@/lib/coupons/queries";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const coupons = await getAdminCoupons();

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <CouponManager coupons={coupons} />
      </div>
    </main>
  );
}
