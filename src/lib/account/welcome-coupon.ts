export const WELCOME_COUPON_CODE = "BEMVINDO10";
export const WELCOME_COUPON_PARAM = "bemvindo10";

export function appendWelcomeCouponParam(path: string): string {
  const [pathname, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);

  params.set("welcome", WELCOME_COUPON_PARAM);

  const nextQueryString = params.toString();

  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
}

export function isWelcomeCouponParam(value: string | undefined): boolean {
  return value === WELCOME_COUPON_PARAM;
}
