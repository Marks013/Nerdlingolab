import { OrderStatus, PaymentStatus, type Prisma } from "@prisma/client";

import type { CheckoutRequestInput } from "@/features/checkout/schemas";
import { validateCartItems } from "@/lib/cart/validation";
import { env } from "@/lib/env";
import { assertMercadoPagoConfigured, mercadoPagoPreference } from "@/lib/mercadopago";
import { generateOrderNumber } from "@/lib/orders/number";
import { prisma } from "@/lib/prisma";

interface CreateCheckoutInput extends CheckoutRequestInput {
  userId?: string;
}

interface MercadoPagoPreferenceResponse {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
}

function buildProductSnapshot(item: Awaited<ReturnType<typeof validateCartItems>>["items"][number]): Prisma.InputJsonObject {
  return {
    productId: item.productId,
    variantId: item.variantId ?? null,
    title: item.title,
    variantTitle: item.variantTitle ?? null,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    lineTotalCents: item.lineTotalCents
  };
}

export interface CreateCheckoutResult {
  orderId: string;
  orderNumber: string;
  preferenceId: string | null;
  checkoutUrl: string | null;
}

export async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const validatedCart = await validateCartItems({
    items: input.items,
    couponCode: input.couponCode,
    loyaltyPointsToRedeem: input.loyaltyPointsToRedeem,
    shippingOptionId: input.shippingOptionId,
    shippingPostalCode: input.shippingAddress.postalCode,
    userId: input.userId
  });

  if (validatedCart.items.length === 0) {
    throw new Error("Carrinho vazio ou indisponível.");
  }

  if (validatedCart.totalCents <= 0) {
    throw new Error("Pedidos com total zero ainda não estão habilitados.");
  }

  if (!validatedCart.selectedShippingOption) {
    throw new Error("Selecione uma opção de entrega antes do pagamento.");
  }

  if (!shouldUseLocalPaymentMock()) {
    assertMercadoPagoConfigured();
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: input.userId,
      couponId: validatedCart.appliedCoupon?.id,
      email: input.customer.email,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      subtotalCents: validatedCart.subtotalCents,
      discountCents: validatedCart.couponDiscountCents,
      loyaltyDiscountCents: validatedCart.loyaltyDiscountCents,
      shippingCents: validatedCart.shippingCents,
      shippingOptionId: validatedCart.selectedShippingOption.id,
      shippingServiceName: validatedCart.selectedShippingOption.name,
      shippingProvider: validatedCart.selectedShippingOption.provider,
      shippingPostalCode: input.shippingAddress.postalCode,
      shippingEstimatedBusinessDays: validatedCart.selectedShippingOption.estimatedBusinessDays,
      taxCents: 0,
      totalCents: validatedCart.totalCents,
      loyaltyPointsRedeemed: validatedCart.loyalty.redeemedPoints,
      shippingAddress: input.shippingAddress,
      customerSnapshot: input.customer,
      paymentIdempotencyKey: crypto.randomUUID(),
      items: {
        create: validatedCart.items.map((item) => ({
          product: { connect: { id: item.productId } },
          variant: item.variantId ? { connect: { id: item.variantId } } : undefined,
          productTitle: item.title,
          variantTitle: item.variantTitle,
          sku: item.variantId,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.lineTotalCents,
          productSnapshot: buildProductSnapshot(item)
        }))
      }
    }
  });

  const preference = await createMercadoPagoPreference({
    orderId: order.id,
    orderNumber: order.orderNumber,
    input,
    totalCents: validatedCart.totalCents
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      mercadoPagoPreferenceId: preference.id ?? null
    }
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    preferenceId: preference.id ?? null,
    checkoutUrl: preference.init_point ?? preference.sandbox_init_point ?? null
  };
}

async function createMercadoPagoPreference({
  orderId,
  orderNumber,
  input,
  totalCents
}: {
  orderId: string;
  orderNumber: string;
  input: CheckoutRequestInput;
  totalCents: number;
}): Promise<MercadoPagoPreferenceResponse> {
  if (shouldUseLocalPaymentMock()) {
    return {
      id: `local-smoke-${orderId}`
    };
  }

  const preference = await mercadoPagoPreference.create({
    body: {
      items: [
        {
          id: orderId,
          title: `Pedido ${orderNumber}`,
          quantity: 1,
          unit_price: totalCents / 100,
          currency_id: "BRL"
        }
      ],
      payer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone ? { number: input.customer.phone } : undefined,
        identification: input.customer.cpf ? { type: "CPF", number: input.customer.cpf } : undefined,
        address: {
          zip_code: input.shippingAddress.postalCode,
          street_name: input.shippingAddress.street,
          street_number: input.shippingAddress.number
        }
      },
      back_urls: {
        success: `${env.APP_URL}/checkout/retorno?status=success`,
        failure: `${env.APP_URL}/checkout/retorno?status=failure`,
        pending: `${env.APP_URL}/checkout/retorno?status=pending`
      },
      auto_return: "approved",
      notification_url: `${env.APP_URL}/api/webhooks/mercadopago`,
      external_reference: orderId,
      statement_descriptor: "NERDLINGOLAB"
    }
  });

  return preference as MercadoPagoPreferenceResponse;
}

function shouldUseLocalPaymentMock(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.CHECKOUT_PAYMENT_MOCK === "true";
}
