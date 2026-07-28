import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export type AuthUser = {
  id: string;
  email: string;
};

type TokenPayload = {
  sub: string;
  email: string;
};

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(
  user: AuthUser,
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign({ email: user.email }, secret, {
    subject: user.id,
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string, secret: string): AuthUser {
  const payload = jwt.verify(token, secret) as TokenPayload;

  if (!payload.sub || !payload.email) {
    throw new Error("Invalid token payload");
  }

  return {
    id: payload.sub,
    email: payload.email,
  };
}
