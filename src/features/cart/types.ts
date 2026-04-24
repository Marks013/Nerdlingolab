export interface CartItem {
  productId: string;
  variantId: string;
  slug: string;
  title: string;
  variantTitle: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
}

export interface CartValidationRequestItem {
  variantId: string;
  quantity: number;
}

export interface CartValidationRequest {
  items: CartValidationRequestItem[];
  couponCode?: string;
  loyaltyPointsToRedeem?: number;
  userId?: string;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  discountCents: number;
}

export interface LoyaltyRedemptionPreview {
  availablePoints: number;
  requestedPoints: number;
  redeemedPoints: number;
  discountCents: number;
  isAvailable: boolean;
}

export interface ValidatedCartItem {
  productId: string;
  variantId: string;
  slug: string;
  title: string;
  variantTitle: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  availableStock: number;
}

export interface CartValidationResponse {
  items: ValidatedCartItem[];
  removedItems: string[];
  subtotalCents: number;
  couponDiscountCents: number;
  loyaltyDiscountCents: number;
  totalCents: number;
  itemCount: number;
  appliedCoupon: AppliedCoupon | null;
  couponMessage: string | null;
  loyalty: LoyaltyRedemptionPreview;
}
