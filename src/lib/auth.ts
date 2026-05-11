import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const COOKIE_NAME = "est_session";
const ALG = "HS256";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function verifyPassword(input: string): Promise<boolean> {
  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash) throw new Error("APP_PASSWORD_HASH is not set");
  return bcrypt.compare(input, hash);
}

export async function issueSession(): Promise<string> {
  return await new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export function isAdminRequest(req: Request): boolean {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const m = /^Bearer\s+(.+)$/.exec(auth);
  if (!m) return false;
  return m[1] === expected;
}

export { COOKIE_NAME };
