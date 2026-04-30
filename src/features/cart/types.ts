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
  shippingOptionId?: string;
  shippingPostalCode?: string;
  userId?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  estimatedBusinessDays: number;
  provider: "MANUAL" | "MERCADO_ENVIOS" | "MELHOR_ENVIO";
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
  maxRedeemablePoints: number;
  minRedeemPoints: number;
  redeemCentsPerPoint: number;
  message: string | null;
}

export interface ValidatedCartItem {
  productId: string;
  variantId: string;
  slug: string;
  title: string;
  variantTitle: string;
  imageUrl: string | null;
  unitPriceCents: number;
  heightCm?: number | null;
  lengthCm?: number | null;
  weightGrams?: number | null;
  widthCm?: number | null;
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
  shippingCents: number;
  freeShippingThresholdCents: number;
  totalCents: number;
  itemCount: number;
  appliedCoupon: AppliedCoupon | null;
  selectedShippingOption: ShippingOption | null;
  shippingOptions: ShippingOption[];
  couponMessage: string | null;
  loyalty: LoyaltyRedemptionPreview;
}
