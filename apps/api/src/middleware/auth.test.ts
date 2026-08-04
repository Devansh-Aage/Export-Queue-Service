import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./auth.js";
import { signToken } from "../lib/auth.js";
import { AppError } from "./error.js";

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
  it("sets req.user and calls next on a valid token", () => {
    const token = signToken(user, SECRET, "1h");
    const req = mockReq(token);
    const next = vi.fn() as unknown as NextFunction;

    authMiddleware(SECRET)(req, {} as Response, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects missing token", () => {
    const next = vi.fn() as unknown as NextFunction;
    authMiddleware(SECRET)(mockReq(), {} as Response, next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls?.[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({
      statusCode: 401,
      message: "Missing or invalid auth token",
    });
  });

  it("rejects invalid token", () => {
    const next = vi.fn() as unknown as NextFunction;
    authMiddleware(SECRET)(mockReq("bogus"), {} as Response, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls?.[0]?.[0];
    expect(err).toMatchObject({
      statusCode: 401,
      message: "Invalid or expired token",
    });
  });
  
  it("rejects token signed with wrong secret", () => {
    const token = signToken(user, "other-secret", "1h");
    const next = vi.fn() as unknown as NextFunction;
    authMiddleware(SECRET)(mockReq(token), {} as Response, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls?.[0]?.[0];
    expect(err).toMatchObject({
      statusCode: 401,
      message: "Invalid or expired token",
    });
  });
});
