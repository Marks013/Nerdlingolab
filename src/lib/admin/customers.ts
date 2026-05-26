import { prisma } from "@/lib/prisma";
import {
  decryptCustomerAddresses,
  decryptSupportTicket,
  decryptUserSensitive
} from "@/lib/privacy/sensitive-data";

export async function getAdminCustomers() {
  const customers = await prisma.user.findMany({
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
      adminNotes: true,
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
          complement: true,
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
        take: 6
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

  return customers.map((customer) => ({
    ...decryptUserSensitive(customer),
    addresses: decryptCustomerAddresses(customer.addresses),
    referralReceived: customer.referralReceived
      ? {
          ...customer.referralReceived,
          inviter: decryptUserSensitive(customer.referralReceived.inviter)
        }
      : customer.referralReceived,
    referralsSent: customer.referralsSent.map((referral) => ({
      ...referral,
      invitee: decryptUserSensitive(referral.invitee)
    }))
  }));
}

export async function getAdminSupportTickets() {
  const tickets = await prisma.supportTicket.findMany({
    include: {
      user: {
        select: {
          email: true,
          id: true,
          name: true
        }
      },
      replies: {
        include: {
          adminUser: {
            select: {
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return tickets.map(decryptSupportTicket);
}
