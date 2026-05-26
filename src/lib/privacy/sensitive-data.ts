import type { Prisma } from "@/generated/prisma/client";

import {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
  encryptStringDeterministic,
  getEncryptedLookupValues,
  isEncryptedValue
} from "@/lib/security/field-encryption";

const AAD = {
  address: "customer-address",
  cpf: "user-cpf",
  orderBillingAddress: "order-billing-address",
  orderCustomerNote: "order-customer-note",
  orderCustomerSnapshot: "order-customer-snapshot",
  orderShippingAddress: "order-shipping-address",
  supportMessage: "support-message",
  supportRatingComment: "support-rating-comment",
  supportReopenReason: "support-reopen-reason",
  supportReplyMessage: "support-reply-message",
  userAdminNotes: "user-admin-notes",
  userName: "user-name",
  userPhone: "user-phone"
} as const;

type NullableString = string | null | undefined;

export function encryptUserSensitiveInput<T extends {
  adminNotes?: NullableString;
  cpf?: NullableString;
  name?: NullableString;
  phone?: NullableString;
}>(input: T): T {
  return {
    ...input,
    adminNotes: "adminNotes" in input ? encryptString(input.adminNotes, AAD.userAdminNotes) : input.adminNotes,
    cpf: "cpf" in input ? encryptStringDeterministic(input.cpf, AAD.cpf) : input.cpf,
    name: "name" in input ? encryptString(input.name, AAD.userName) : input.name,
    phone: "phone" in input ? encryptString(input.phone, AAD.userPhone) : input.phone
  };
}

export function decryptUserSensitive<T extends {
  adminNotes?: NullableString;
  cpf?: NullableString;
  name?: NullableString;
  phone?: NullableString;
} | null>(user: T): T {
  if (!user) return user;

  return {
    ...user,
    adminNotes: "adminNotes" in user ? decryptString(user.adminNotes, AAD.userAdminNotes) : user.adminNotes,
    cpf: "cpf" in user ? decryptString(user.cpf, AAD.cpf) : user.cpf,
    name: "name" in user ? decryptString(user.name, AAD.userName) : user.name,
    phone: "phone" in user ? decryptString(user.phone, AAD.userPhone) : user.phone
  };
}

export function getEncryptedCpfLookupValues(values: readonly string[]): string[] {
  return getEncryptedLookupValues(values, AAD.cpf);
}

export function encryptCustomerAddressInput<T extends {
  city: string;
  complement?: NullableString;
  country?: string;
  district: string;
  label?: NullableString;
  number: string;
  postalCode: string;
  recipient: string;
  state: string;
  street: string;
}>(address: T): T {
  return {
    ...address,
    city: encryptString(address.city, AAD.address)!,
    complement: encryptString(address.complement, AAD.address),
    district: encryptString(address.district, AAD.address)!,
    label: encryptString(address.label, AAD.address),
    number: encryptString(address.number, AAD.address)!,
    postalCode: encryptString(address.postalCode, AAD.address)!,
    recipient: encryptString(address.recipient, AAD.address)!,
    state: encryptString(address.state, AAD.address)!,
    street: encryptString(address.street, AAD.address)!
  };
}

export function decryptCustomerAddress<T extends {
  city: string;
  complement?: NullableString;
  district: string;
  label?: NullableString;
  number: string;
  postalCode: string;
  recipient: string;
  state: string;
  street: string;
} | null>(address: T): T {
  if (!address) return address;

  return {
    ...address,
    city: decryptString(address.city, AAD.address) ?? "",
    complement: decryptString(address.complement, AAD.address),
    district: decryptString(address.district, AAD.address) ?? "",
    label: decryptString(address.label, AAD.address),
    number: decryptString(address.number, AAD.address) ?? "",
    postalCode: decryptString(address.postalCode, AAD.address) ?? "",
    recipient: decryptString(address.recipient, AAD.address) ?? "",
    state: decryptString(address.state, AAD.address) ?? "",
    street: decryptString(address.street, AAD.address) ?? ""
  };
}

export function decryptCustomerAddresses<T extends Parameters<typeof decryptCustomerAddress>[0]>(addresses: T[]): T[] {
  return addresses.map((address) => decryptCustomerAddress(address));
}

export function encryptOrderSensitiveInput<T extends {
  billingAddress?: Prisma.InputJsonValue;
  customerNote?: NullableString;
  customerSnapshot?: Prisma.InputJsonValue;
  shippingAddress: Prisma.InputJsonValue;
}>(input: T): T {
  return {
    ...input,
    billingAddress: input.billingAddress ? encryptJson(input.billingAddress, AAD.orderBillingAddress) : input.billingAddress,
    customerNote: "customerNote" in input ? encryptString(input.customerNote, AAD.orderCustomerNote) : input.customerNote,
    customerSnapshot: "customerSnapshot" in input ? encryptJson(input.customerSnapshot ?? {}, AAD.orderCustomerSnapshot) : input.customerSnapshot,
    shippingAddress: encryptJson(input.shippingAddress, AAD.orderShippingAddress)
  };
}

export function decryptOrderSensitive<T extends {
  billingAddress?: unknown;
  customerNote?: NullableString;
  customerSnapshot?: unknown;
  shippingAddress?: unknown;
} | null>(order: T): T {
  if (!order) return order;

  return {
    ...order,
    billingAddress: "billingAddress" in order
      ? decryptJson(order.billingAddress, AAD.orderBillingAddress, null)
      : order.billingAddress,
    customerNote: "customerNote" in order
      ? decryptString(order.customerNote, AAD.orderCustomerNote)
      : order.customerNote,
    customerSnapshot: "customerSnapshot" in order
      ? decryptJson(order.customerSnapshot, AAD.orderCustomerSnapshot, {})
      : order.customerSnapshot,
    shippingAddress: "shippingAddress" in order
      ? decryptJson(order.shippingAddress, AAD.orderShippingAddress, {})
      : order.shippingAddress
  };
}

export function encryptSupportTicketInput<T extends {
  email?: NullableString;
  message?: NullableString;
  name?: NullableString;
  phone?: NullableString;
  ratingComment?: NullableString;
  reopenReason?: NullableString;
}>(input: T): T {
  return {
    ...input,
    message: "message" in input ? encryptString(input.message, AAD.supportMessage) : input.message,
    name: "name" in input ? encryptString(input.name, AAD.userName) : input.name,
    phone: "phone" in input ? encryptString(input.phone, AAD.userPhone) : input.phone,
    ratingComment: "ratingComment" in input ? encryptString(input.ratingComment, AAD.supportRatingComment) : input.ratingComment,
    reopenReason: "reopenReason" in input ? encryptString(input.reopenReason, AAD.supportReopenReason) : input.reopenReason
  };
}

export function decryptSupportTicket<T extends {
  message?: NullableString;
  name?: NullableString;
  phone?: NullableString;
  ratingComment?: NullableString;
  reopenReason?: NullableString;
  replies?: Array<{ message?: NullableString }>;
  user?: { name?: NullableString; phone?: NullableString; cpf?: NullableString; adminNotes?: NullableString } | null;
} | null>(ticket: T): T {
  if (!ticket) return ticket;

  return {
    ...ticket,
    message: "message" in ticket ? decryptString(ticket.message, AAD.supportMessage) : ticket.message,
    name: "name" in ticket ? decryptString(ticket.name, AAD.userName) : ticket.name,
    phone: "phone" in ticket ? decryptString(ticket.phone, AAD.userPhone) : ticket.phone,
    ratingComment: "ratingComment" in ticket
      ? decryptString(ticket.ratingComment, AAD.supportRatingComment)
      : ticket.ratingComment,
    reopenReason: "reopenReason" in ticket
      ? decryptString(ticket.reopenReason, AAD.supportReopenReason)
      : ticket.reopenReason,
    replies: Array.isArray(ticket.replies) ? ticket.replies.map(decryptSupportReply) : ticket.replies,
    user: ticket.user ? decryptUserSensitive(ticket.user) : ticket.user
  };
}

export function encryptSupportReplyInput<T extends { message?: NullableString }>(input: T): T {
  return {
    ...input,
    message: "message" in input ? encryptString(input.message, AAD.supportReplyMessage) : input.message
  };
}

export function decryptSupportReply<T extends { message?: NullableString }>(reply: T): T {
  return {
    ...reply,
    message: "message" in reply ? decryptString(reply.message, AAD.supportReplyMessage) : reply.message
  };
}

export function containsEncryptedSensitiveValue(value: unknown): boolean {
  if (isEncryptedValue(value)) return true;
  if (Array.isArray(value)) return value.some(containsEncryptedSensitiveValue);
  if (value && typeof value === "object") return Object.values(value).some(containsEncryptedSensitiveValue);
  return false;
}
