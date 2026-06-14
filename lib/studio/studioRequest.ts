import { RequestValidationError, readJsonObject, validationErrorResponse } from "@/lib/security/validateRequest";

export async function readStudioBody(request: Request) {
  return readJsonObject(request);
}

export function requiredText(value: unknown, label: string, maxLength = 100_000): string {
  if (typeof value !== "string" || !value.trim()) throw new RequestValidationError(`${label} is required.`);
  if (value.length > maxLength) throw new RequestValidationError(`${label} exceeds the supported length.`);
  return value;
}

export function optionalText(value: unknown, maxLength = 20_000): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > maxLength) throw new RequestValidationError("Optional text input is malformed or exceeds limits.");
  return value;
}

export function stringList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 100 || !value.every((item) => typeof item === "string" && item.length <= 500)) {
    throw new RequestValidationError("File list is malformed or exceeds limits.");
  }
  return value;
}

export { validationErrorResponse };
