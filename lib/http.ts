import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAuth";

export function ok(data: unknown, init?: number | ResponseInit) {
  if (typeof init === "number") {
    return NextResponse.json({ success: true, data }, { status: init });
  }
  return NextResponse.json({ success: true, data }, init);
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

type RouteContextLike = { params?: Promise<Record<string, string>> | Record<string, string> } | undefined;

export async function getParams(context: RouteContextLike) {
  const params = context?.params;
  if (!params) return {};
  return typeof params?.then === "function" ? await params : params;
}

export async function parseJson(req: Request) {
  return req.json().catch(() => ({}));
}

export function authErrorToResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const name = error instanceof Error ? error.name : "";
  if (code === "NO_TOKEN") return fail("Missing token", 401);
  if (code === "NOT_ADMIN") return fail("Forbidden", 403);
  if (code === "invalid token" || code === "jwt malformed") return fail("Invalid token", 401);
  if (code === "jwt expired" || name === "TokenExpiredError") return fail("Token expired", 401);
  if (name === "JsonWebTokenError" || name === "NotBeforeError") return fail("Invalid token", 401);
  return null;
}

export function withAdmin(
  handler: (req: Request, context?: RouteContextLike) => Promise<Response> | Response
) {
  return async (req: Request, context?: RouteContextLike) => {
    try {
      requireAdmin(req);
      return await handler(req, context);
    } catch (error) {
      const authRes = authErrorToResponse(error);
      if (authRes) return authRes;
      const message = error instanceof Error ? error.message : "Server error";
      return fail(message, 500);
    }
  };
}
