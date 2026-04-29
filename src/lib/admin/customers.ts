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
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          city: true,
          district: true,
          id: true,
          isDefault: true,
          label: true,
          number: true,
          postalCode: true,
          recipient: true,
          state: true,
          street: true
        },
        take: 3
      },
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          id: true,
          orderNumber: true,
          paymentStatus: true,
          status: true,
          totalCents: true
        },
        take: 3
      },
      phone: true,
      referralCode: {
        select: {
          code: true,
          isActive: true
        }
      },
      referralsSent: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          id: true,
          invitee: { select: { email: true, name: true } },
          status: true
        },
        take: 5
      },
      referralReceived: {
        select: {
          createdAt: true,
          inviter: { select: { email: true, name: true } },
          referralCode: true,
          status: true
        }
      },
      supportTickets: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          id: true,
          status: true,
          subjectLabel: true,
          ticketId: true
        },
        take: 4
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
