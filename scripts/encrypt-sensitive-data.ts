import { prisma } from "@/lib/prisma";
import {
  encryptCustomerAddressInput,
  encryptOrderSensitiveInput,
  encryptSupportReplyInput,
  encryptSupportTicketInput,
  encryptUserSensitiveInput
} from "@/lib/privacy/sensitive-data";
import { assertFieldEncryptionConfigured } from "@/lib/security/field-encryption";

async function main(): Promise<void> {
  assertFieldEncryptionConfigured();

  const stats = {
    addresses: 0,
    orders: 0,
    supportReplies: 0,
    supportTickets: 0,
    users: 0
  };

  const users = await prisma.user.findMany({
    select: {
      adminNotes: true,
      cpf: true,
      id: true,
      name: true,
      phone: true
    }
  });

  for (const user of users) {
    await prisma.user.update({
      data: encryptUserSensitiveInput({
        adminNotes: user.adminNotes,
        cpf: user.cpf,
        name: user.name,
        phone: user.phone
      }),
      where: { id: user.id }
    });
    stats.users += 1;
  }

  const addresses = await prisma.customerAddress.findMany();
  for (const address of addresses) {
    await prisma.customerAddress.update({
      data: encryptCustomerAddressInput({
        city: address.city,
        complement: address.complement,
        country: address.country,
        district: address.district,
        label: address.label,
        number: address.number,
        postalCode: address.postalCode,
        recipient: address.recipient,
        state: address.state,
        street: address.street
      }),
      where: { id: address.id }
    });
    stats.addresses += 1;
  }

  const orders = await prisma.order.findMany({
    select: {
      billingAddress: true,
      customerNote: true,
      customerSnapshot: true,
      id: true,
      shippingAddress: true
    }
  });
  for (const order of orders) {
    const encryptedOrder = encryptOrderSensitiveInput({
      customerNote: order.customerNote,
      customerSnapshot: order.customerSnapshot ?? {},
      shippingAddress: order.shippingAddress ?? {},
      ...(order.billingAddress ? { billingAddress: order.billingAddress } : {})
    });

    await prisma.order.update({
      data: encryptedOrder,
      where: { id: order.id }
    });
    stats.orders += 1;
  }

  const tickets = await prisma.supportTicket.findMany({
    select: {
      id: true,
      message: true,
      name: true,
      phone: true,
      ratingComment: true,
      reopenReason: true
    }
  });
  for (const ticket of tickets) {
    await prisma.supportTicket.update({
      data: encryptSupportTicketInput({
        message: ticket.message,
        name: ticket.name,
        phone: ticket.phone,
        ratingComment: ticket.ratingComment,
        reopenReason: ticket.reopenReason
      }),
      where: { id: ticket.id }
    });
    stats.supportTickets += 1;
  }

  const replies = await prisma.supportTicketReply.findMany({
    select: {
      id: true,
      message: true
    }
  });
  for (const reply of replies) {
    await prisma.supportTicketReply.update({
      data: encryptSupportReplyInput({
        message: reply.message
      }),
      where: { id: reply.id }
    });
    stats.supportReplies += 1;
  }

  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
