import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { NextRequest } from "next/server";

export interface JwtPayload {
  sub: string;
  email?: string;
  role: string;
  name?: string;
  isGuest?: boolean;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

function getSecret() {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
  return JWT_SECRET;
}

export function signUserToken(user: {
  _id: { toString(): string };
  email: string;
  role: string;
  name: string;
}): string {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    },
    getSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function signGuestToken(): string {
  const guestId = `guest_${randomBytes(16).toString("hex")}`;
  return jwt.sign(
    { sub: guestId, role: "guest", isGuest: true },
    getSecret(),
    { expiresIn: "24h" }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}

/** Extract and verify Bearer token from an API request. Returns null if missing/invalid. */
export function getAuthPayload(req: NextRequest): JwtPayload | null {
  try {
    const hdr = req.headers.get("authorization") || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

/** Throw a 401 JSON Response if the token is missing or invalid. */
export function requireAuth(req: NextRequest): JwtPayload {
  const payload = getAuthPayload(req);
  if (!payload) throw new ApiError(401, "Missing or invalid token");
  return payload;
}

/** Throw a 403 if the user is a guest (requires registered account). */
export function requireRegistered(payload: JwtPayload): void {
  if (payload.isGuest) {
    throw new ApiError(403, "This feature requires a registered account");
  }
}

/** Simple structured error for API routes. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isGuest(payload: JwtPayload): boolean {
  return payload.isGuest === true;
}
