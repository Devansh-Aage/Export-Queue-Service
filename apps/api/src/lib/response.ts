import type { Response } from "express";

export type SuccessResponse<T> = {
  success: true;
  data: T;
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
): void {
  const body: SuccessResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(body);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

