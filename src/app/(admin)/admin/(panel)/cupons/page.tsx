import { CouponManager } from "@/features/coupons/components/coupon-manager";
import { requireAdmin } from "@/lib/admin";
import { getAdminCoupons, type AdminCouponFilters } from "@/lib/coupons/queries";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  await requireAdmin();

  const filters = parseCouponFilters(await searchParams);
  const couponData = await getAdminCoupons(filters);

  return (
    <main>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CouponManager data={couponData} />
      </div>
    </main>
  );
}

function parseCouponFilters(searchParams?: Record<string, string | string[] | undefined>): AdminCouponFilters {
  return {
    query: normalizeSearchParam(searchParams?.busca),
    status: readAllowedFilter(normalizeSearchParam(searchParams?.status), ["active", "expired", "inactive"]),
    visibility: readAllowedFilter(normalizeSearchParam(searchParams?.visibilidade), ["private", "public"])
  };
}

function normalizeSearchParam(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

function readAllowedFilter<const T extends string>(value: string | undefined, options: readonly T[]): T | undefined {
  return options.includes(value as T) ? value as T : undefined;
}
