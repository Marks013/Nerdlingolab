import { OrderStatus, PaymentStatus, type Prisma } from "@/generated/prisma/client";

import type { CheckoutRequestInput } from "@/features/checkout/schemas";
import type { CustomerAddressInput } from "@/lib/addresses/schema";
import { validateCartItems } from "@/lib/cart/validation";
import { sendOrderCreatedEmail } from "@/lib/email/transactional";
import {
  releaseInventoryReservations,
  reserveInventoryForCheckout
} from "@/lib/inventory/reservations";
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

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const mercadoPagoWebhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL
  ?? `${appUrl}/api/webhooks/mercadopago`;
const mercadoPagoReturnUrlBase = process.env.MERCADO_PAGO_RETURN_URL_BASE ?? appUrl;

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

function buildShippingAddressSnapshot(address: CustomerAddressInput): Prisma.InputJsonObject {
  return {
    recipient: address.recipient,
    postalCode: address.postalCode,
    street: address.street,
    number: address.number,
    complement: address.complement ?? null,
    district: address.district,
    city: address.city,
    state: address.state,
    country: address.country
  };
}

export interface CreateCheckoutResult {
  orderId: string;
  orderNumber: string;
  preferenceId: string | null;
  checkoutUrl: string | null;
}

export async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const shippingAddress = await resolveShippingAddress(input);
  const validatedCart = await validateCartItems({
    items: input.items,
    couponCode: input.couponCode,
    shippingOptionId: input.shippingOptionId,
    shippingPostalCode: shippingAddress.postalCode,
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

  const selectedShippingOption = validatedCart.selectedShippingOption;

  if (!shouldUseLocalPaymentMock()) {
    assertMercadoPagoConfigured();
  }

  const order = await prisma.$transaction(async (tx) => {
    await reserveInventoryForCheckout(tx, validatedCart.items);

    return tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: input.userId,
        couponId: validatedCart.appliedCoupon?.id,
        email: input.customer.email,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotalCents: validatedCart.subtotalCents,
        discountCents: validatedCart.couponDiscountCents,
        loyaltyDiscountCents: 0,
        shippingCents: validatedCart.shippingCents,
        shippingOptionId: selectedShippingOption.id,
        shippingServiceName: selectedShippingOption.name,
        shippingProvider: selectedShippingOption.provider,
        shippingPostalCode: shippingAddress.postalCode,
        shippingEstimatedBusinessDays: selectedShippingOption.estimatedBusinessDays,
        taxCents: 0,
        totalCents: validatedCart.totalCents,
        loyaltyPointsRedeemed: 0,
        shippingAddress: buildShippingAddressSnapshot(shippingAddress),
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
  });

  const preference = await createCheckoutPreferenceOrCancel({
    input,
    orderId: order.id,
    orderNumber: order.orderNumber,
    reservationItems: validatedCart.items,
    shippingAddress,
    totalCents: validatedCart.totalCents
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      mercadoPagoPreferenceId: preference.id ?? null
    }
  });

  const checkoutResult = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    preferenceId: preference.id ?? null,
    checkoutUrl: preference.init_point ?? preference.sandbox_init_point ?? null
  };

  await sendOrderCreatedEmail({
    checkoutUrl: checkoutResult.checkoutUrl,
    orderId: order.id
  });

  return checkoutResult;
}

async function createCheckoutPreferenceOrCancel({
  input,
  orderId,
  orderNumber,
  reservationItems,
  shippingAddress,
  totalCents
}: {
  input: CheckoutRequestInput;
  orderId: string;
  orderNumber: string;
  reservationItems: Awaited<ReturnType<typeof validateCartItems>>["items"];
  shippingAddress: CustomerAddressInput;
  totalCents: number;
}): Promise<MercadoPagoPreferenceResponse> {
  try {
    return await createMercadoPagoPreference({
      orderId,
      orderNumber,
      input,
      shippingAddress,
      totalCents
    });
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      await releaseInventoryReservations(tx, reservationItems);
      await tx.order.update({
        where: { id: orderId },
        data: {
          canceledAt: new Date(),
          paymentStatus: PaymentStatus.CANCELED,
          status: OrderStatus.CANCELED
        }
      });
    });

    throw error;
  }
}

async function createMercadoPagoPreference({
  orderId,
  orderNumber,
  input,
  shippingAddress,
  totalCents
}: {
  orderId: string;
  orderNumber: string;
  input: CheckoutRequestInput;
  shippingAddress: CustomerAddressInput;
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
          zip_code: shippingAddress.postalCode,
          street_name: shippingAddress.street,
          street_number: shippingAddress.number
        }
      },
      back_urls: {
        success: `${mercadoPagoReturnUrlBase}/checkout/retorno?status=success`,
        failure: `${mercadoPagoReturnUrlBase}/checkout/retorno?status=failure`,
        pending: `${mercadoPagoReturnUrlBase}/checkout/retorno?status=pending`
      },
      auto_return: "approved",
      notification_url: mercadoPagoWebhookUrl,
      external_reference: orderId,
      statement_descriptor: "NERDLINGOLAB"
    }
  });

  return preference as MercadoPagoPreferenceResponse;
}

async function resolveShippingAddress(input: CreateCheckoutInput): Promise<CustomerAddressInput> {
  if (!input.savedAddressId) {
    return input.shippingAddress;
  }

  if (!input.userId) {
    throw new Error("Entre na conta para usar um endereço salvo.");
  }

  const savedAddress = await prisma.customerAddress.findFirst({
    where: {
      id: input.savedAddressId,
      userId: input.userId
    }
  });

  if (!savedAddress) {
    throw new Error("Endereço salvo não encontrado.");
  }

  return {
    recipient: savedAddress.recipient,
    postalCode: savedAddress.postalCode,
    street: savedAddress.street,
    number: savedAddress.number,
    complement: savedAddress.complement ?? undefined,
    district: savedAddress.district,
    city: savedAddress.city,
    state: savedAddress.state,
    country: savedAddress.country
  };
}

function shouldUseLocalPaymentMock(): boolean {
  return process.env.CHECKOUT_PAYMENT_MOCK === "true" && process.env.NODE_ENV !== "production";
}
