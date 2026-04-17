import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { signUserToken } from "@/lib/auth";

function must(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = must(body?.email).toLowerCase();
    const password = must(body?.password);

    if (!email || !password)
      return NextResponse.json({ error: "email, password required" }, { status: 400 });
    if (!isEmail(email))
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

    await connectDB();

    const user = await User.findOne({ email });
    if (!user)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = signUserToken(user);

    return NextResponse.json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    console.error("LOGIN error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
