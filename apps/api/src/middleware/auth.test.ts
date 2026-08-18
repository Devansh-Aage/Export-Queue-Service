import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { signToken } from "../lib/auth.js";
import { AppError } from "./error.js";

vi.mock("@repo/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@repo/prisma";
import { authMiddleware } from "./auth.js";

const SECRET = "test-secret";
const user = {
  id: "user-1",
  email: "example@gmail.com",
};

function mockReq(token?: string): Request {
  return {
    cookies: token === undefined ? {} : { token },
  } as Request;
}

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findFirst).mockReset();
  });

  it("sets req.user and calls next on a valid token", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: user.id,
      email: user.email,
      password: "hash",
    });

    const token = signToken(user, SECRET, "1h");
    const req = mockReq(token);
    const next = vi.fn() as unknown as NextFunction;

    await authMiddleware(SECRET)(req, {} as Response, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects missing token", async () => {
    const next = vi.fn() as unknown as NextFunction;
    await authMiddleware(SECRET)(mockReq(), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls?.[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({
      statusCode: 401,
      message: "Missing or invalid auth token",
    });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("rejects invalid token", async () => {
    const next = vi.fn() as unknown as NextFunction;
    await authMiddleware(SECRET)(mockReq("bogus"), {} as Response, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls?.[0]?.[0];
    expect(err).toMatchObject({
      statusCode: 401,
      message: "Invalid or expired token",
    });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("rejects token signed with wrong secret", async () => {
    const token = signToken(user, "other-secret", "1h");
    const next = vi.fn() as unknown as NextFunction;
    await authMiddleware(SECRET)(mockReq(token), {} as Response, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls?.[0]?.[0];
    expect(err).toMatchObject({
      statusCode: 401,
      message: "Invalid or expired token",
    });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a valid token when the user no longer exists", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const token = signToken(user, SECRET, "1h");
    const next = vi.fn() as unknown as NextFunction;

    await authMiddleware(SECRET)(mockReq(token), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls?.[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({
      statusCode: 401,
      message: "User doesn't exist!",
    });
  });
});
