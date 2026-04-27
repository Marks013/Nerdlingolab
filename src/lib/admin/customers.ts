import { prisma } from "@/lib/prisma";

export async function getAdminCustomers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      _count: {
        select: {
          orders: true,
          supportTickets: true,
          addresses: true
        }
      },
      cpf: true,
      createdAt: true,
      email: true,
      id: true,
      loyaltyPoints: true,
      name: true,
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          orderNumber: true,
          status: true,
          totalCents: true
        },
        take: 1
      },
      phone: true,
      referralCode: {
        select: {
          code: true,
          isActive: true
        }
      },
      role: true
    },
    take: 100
  });
}

export async function getAdminSupportTickets() {
  return prisma.supportTicket.findMany({
    include: {
      user: {
        select: {
          email: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}
