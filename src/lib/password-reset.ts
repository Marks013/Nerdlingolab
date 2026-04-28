import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const passwordResetTtlMs = 1000 * 60 * 45;

export interface PasswordResetToken {
  email: string;
  expires: Date;
  name: string | null;
  token: string;
  userId: string;
}

export function getAppBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getRequestBaseUrl(requestHeaders: Headers): string {
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? requestHeaders.get("host")?.trim();

  if (host) {
    return `${forwardedProto ?? "http"}://${host}`.replace(/\/$/, "");
  }

  return getAppBaseUrl();
}

export async function createPasswordResetTokenForEmail(email: string): Promise<PasswordResetToken | null> {
  const user = await prisma.user.findUnique({
    select: { email: true, id: true, name: true, passwordHash: true },
    where: { email }
  });

  if (!user?.passwordHash) {
    return null;
  }

  return createPasswordResetTokenForUser(user);
}

export async function createPasswordResetTokenForUserId(userId: string): Promise<PasswordResetToken | null> {
  const user = await prisma.user.findUnique({
    select: { email: true, id: true, name: true, passwordHash: true },
    where: { id: userId }
  });

  if (!user?.passwordHash) {
    return null;
  }

  return createPasswordResetTokenForUser(user);
}

export async function resetPasswordWithToken({
  password,
  token,
  userId
}: {
  password: string;
  token: string;
  userId: string;
}): Promise<boolean> {
  const identifier = getPasswordResetIdentifier(userId);
  const hashedToken = hashToken(token);
  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      expires: { gt: new Date() },
      identifier,
      token: hashedToken
    }
  });

  if (!verificationToken) {
    return false;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      data: { passwordHash },
      where: { id: userId }
    }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.verificationToken.deleteMany({ where: { identifier } })
  ]);

  return true;
}

function createPasswordResetTokenForUser(user: { email: string; id: string; name: string | null }): Promise<PasswordResetToken> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + passwordResetTtlMs);
  const identifier = getPasswordResetIdentifier(user.id);

  return prisma.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({
      data: {
        expires,
        identifier,
        token: hashToken(token)
      }
    });

    return {
      email: user.email,
      expires,
      name: user.name,
      token,
      userId: user.id
    };
  });
}

function getPasswordResetIdentifier(userId: string): string {
  return `password-reset:${userId}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
