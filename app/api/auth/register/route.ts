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
    const name = must(body?.name);
    const email = must(body?.email).toLowerCase();
    const password = must(body?.password);

    if (!name || !email || !password)
      return NextResponse.json(
        { error: "name, email, password are required" },
        { status: 400 }
      );
    if (!isEmail(email))
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );

    await connectDB();

    const exists = await User.findOne({ email }).lean();
    if (exists)
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: "user" });
    const token = signUserToken(user);

    return NextResponse.json(
      {
        ok: true,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        token,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("REGISTER error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
