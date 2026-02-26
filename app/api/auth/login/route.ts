import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  await dbConnect();

  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
  }

  const user = await User.findOne({ username }).lean();
  if (!user || user.password !== password) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const token = signToken({ uid: String(user._id), username: user.username, role: "admin" });

  // return token to frontend (as you requested)
  return NextResponse.json({ success: true, data: { token, username: user.username, role: user.role } });
}