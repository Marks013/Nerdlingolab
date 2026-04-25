import type {
  Coupon,
  CouponRedemption,
  CustomerAddress,
  InventoryLedger,
  LoyaltyLedger,
  Order,
  OrderItem,
  LoyaltyPoints,
  Shipment,
  ShipmentEvent,
  User
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AdminOrderListItem = Order & {
  user: Pick<User, "id" | "name" | "email"> | null;
  coupon: Pick<Coupon, "id" | "code"> | null;
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
};

export type CustomerOrderDetail = Order & {
  items: OrderItem[];
  loyaltyLedger: LoyaltyLedger[];
};

export type CustomerAccountSummary = {
  user: Pick<User, "id" | "name" | "email">;
  addresses: CustomerAddress[];
  loyaltyPoints: LoyaltyPoints | null;
  orders: CustomerOrderListItem[];
};

export type CustomerSavedAddress = CustomerAddress;

export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  return prisma.order.findMany({
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
      email: user.email
    },
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
        orderBy: { createdAt: "asc" }
      },
      loyaltyLedger: {
        orderBy: { createdAt: "desc" }
      }
    }
  });
}
