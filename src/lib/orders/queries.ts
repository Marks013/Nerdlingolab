import type {
  Coupon,
  CouponRedemption,
  CustomerAddress,
  Account,
  InventoryLedger,
  LoyaltyLedger,
  Order,
  OrderItem,
  LoyaltyPoints,
  MediaAsset,
  ProductReview,
  ProductReviewMedia,
  Shipment,
  ShipmentEvent,
  User
} from "@/generated/prisma/client";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import type { OrderWhereInput } from "@/generated/prisma/models/Order";

import { prisma } from "@/lib/prisma";

export type AdminOrderListItem = Order & {
  user: Pick<User, "id" | "name" | "email"> | null;
  coupon: Pick<Coupon, "id" | "code"> | null;
  shipments: (Shipment & { events: ShipmentEvent[] })[];
  _count: {
    items: number;
  };
};

export type AdminOrderDetail = Order & {
  user: Pick<User, "id" | "name" | "email" | "cpf" | "phone"> | null;
  coupon: Coupon | null;
  items: OrderItem[];
  couponRedemptions: CouponRedemption[];
  loyaltyLedger: LoyaltyLedger[];
  inventoryLedger: InventoryLedger[];
  shipments: (Shipment & { events: ShipmentEvent[] })[];
};

export type CustomerOrderListItem = Order & {
  items: Pick<OrderItem, "id" | "productTitle" | "quantity">[];
  shipments: (Shipment & { events: ShipmentEvent[] })[];
};

export type CustomerOrderDetail = Order & {
  items: (OrderItem & {
    review: (ProductReview & {
      media: (ProductReviewMedia & { asset: MediaAsset })[];
    }) | null;
  })[];
  loyaltyLedger: LoyaltyLedger[];
  shipments: (Shipment & { events: ShipmentEvent[] })[];
};

export type CustomerAccountSummary = {
  user: Pick<User, "id" | "name" | "email" | "cpf" | "phone" | "birthday">;
  accounts: Pick<Account, "provider">[];
  addresses: CustomerAddress[];
  loyaltyPoints: LoyaltyPoints | null;
  orders: CustomerOrderListItem[];
};

export type CustomerSavedAddress = CustomerAddress;

export const adminOrderStatuses = Object.values(OrderStatus);
export const adminPaymentStatuses = Object.values(PaymentStatus);

export interface AdminOrderFilters {
  endDate?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  query?: string;
  startDate?: string;
}

export function resolveAdminOrderFilters(filters: Partial<AdminOrderFilters> = {}): AdminOrderFilters {
  const query = filters.query?.trim().slice(0, 120) || undefined;
  const orderStatus = filters.orderStatus && adminOrderStatuses.includes(filters.orderStatus)
    ? filters.orderStatus
    : undefined;
  const paymentStatus = filters.paymentStatus && adminPaymentStatuses.includes(filters.paymentStatus)
    ? filters.paymentStatus
    : undefined;
  const startDate = isDateInput(filters.startDate) ? filters.startDate : undefined;
  const endDate = isDateInput(filters.endDate) ? filters.endDate : undefined;

  if (startDate && endDate && parseDateInput(startDate) > parseDateInput(endDate)) {
    return {
      endDate: startDate,
      orderStatus,
      paymentStatus,
      query,
      startDate: endDate
    };
  }

  return {
    endDate,
    orderStatus,
    paymentStatus,
    query,
    startDate
  };
}

export async function getAdminOrders(filters: Partial<AdminOrderFilters> = {}): Promise<AdminOrderListItem[]> {
  const resolvedFilters = resolveAdminOrderFilters(filters);

  return prisma.order.findMany({
    where: buildAdminOrderWhere(resolvedFilters),
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      coupon: {
        select: {
          id: true,
          code: true
        }
      },
      _count: {
        select: {
          items: true
        }
      },
      shipments: {
        include: {
          events: {
            orderBy: { occurredAt: "desc" },
            take: 1
          }
        },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function getAdminOrderById(orderId: string): Promise<AdminOrderDetail | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          phone: true
        }
      },
      coupon: true,
      items: {
        include: {
          review: {
            include: {
              media: {
                include: {
                  asset: true
                },
                orderBy: { sortOrder: "asc" }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      },
      couponRedemptions: {
        orderBy: { createdAt: "desc" }
      },
      loyaltyLedger: {
        orderBy: { createdAt: "desc" }
      },
      inventoryLedger: {
        orderBy: { createdAt: "desc" }
      },
      shipments: {
        include: {
          events: {
            orderBy: { occurredAt: "desc" }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function getCustomerAccountSummary(
  userId: string
): Promise<CustomerAccountSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      phone: true,
      birthday: true,
      accounts: {
        select: {
          provider: true
        },
        orderBy: { provider: "asc" }
      },
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
      },
      loyaltyPoints: true,
      orders: {
        include: {
          items: {
            select: {
              id: true,
              productTitle: true,
              quantity: true
            }
          },
          shipments: {
            include: {
              events: {
                orderBy: { occurredAt: "desc" },
                take: 1
              }
            },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone,
      birthday: user.birthday
    },
    accounts: user.accounts,
    addresses: user.addresses,
    loyaltyPoints: user.loyaltyPoints,
    orders: user.orders
  };
}

export async function getCustomerSavedAddresses(userId: string): Promise<CustomerSavedAddress[]> {
  return prisma.customerAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
  });
}

export async function getCustomerOrderById({
  orderId,
  userId
}: {
  orderId: string;
  userId: string;
}): Promise<CustomerOrderDetail | null> {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      userId
    },
    include: {
      items: {
        include: {
          review: {
            include: {
              media: {
                include: {
                  asset: true
                },
                orderBy: { sortOrder: "asc" }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      },
      loyaltyLedger: {
        orderBy: { createdAt: "desc" }
      },
      shipments: {
        include: {
          events: {
            orderBy: { occurredAt: "desc" }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

function buildAdminOrderWhere(filters: AdminOrderFilters): OrderWhereInput {
  const conditions: OrderWhereInput[] = [];

  if (filters.query) {
    conditions.push({
      OR: [
        { orderNumber: { contains: filters.query, mode: "insensitive" } },
        { email: { contains: filters.query, mode: "insensitive" } },
        { user: { email: { contains: filters.query, mode: "insensitive" } } },
        { user: { name: { contains: filters.query, mode: "insensitive" } } }
      ]
    });
  }

  if (filters.orderStatus) {
    conditions.push({ status: filters.orderStatus });
  }

  if (filters.paymentStatus) {
    conditions.push({ paymentStatus: filters.paymentStatus });
  }

  if (filters.startDate || filters.endDate) {
    conditions.push({
      createdAt: {
        gte: filters.startDate ? parseDateInput(filters.startDate) : undefined,
        lt: filters.endDate ? addDays(parseDateInput(filters.endDate), 1) : undefined
      }
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function isDateInput(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return parseDateInput(value).toISOString().slice(0, 10) === value;
}

function parseDateInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
