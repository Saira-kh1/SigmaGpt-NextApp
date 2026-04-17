"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const passwordsMismatch = confirm.length > 0 && password !== confirm;
  const passwordStrength =
    password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"];
  const strengthColor = ["", "text-red-400", "text-yellow-400", "text-green-400"];
  const strengthBg = ["", "bg-red-400", "bg-yellow-400", "bg-green-400"];

  const canSubmit =
    !!name.trim() && !!email.trim() && password.length >= 8 && !passwordsMismatch && !loading;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!canSubmit) {
      if (!name || !email || !password) setErr("All fields are required.");
      else if (password.length < 8) setErr("Password must be at least 8 characters.");
      else if (password !== confirm) setErr("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post("/api/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.replace("/chat");
    } catch (error: unknown) {
      const anyErr = error as { response?: { data?: { error?: string } } };
      setErr(anyErr?.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen px-4 py-8 text-white bg-gray-950"
      style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}
    >
      <div
        className="pointer-events-none fixed top-[-200px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-15"
        style={{ background: "radial-gradient(ellipse, #16a34a 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black tracking-tight" style={{ fontFamily: "monospace" }}>
              Σ<span className="text-green-400">IGMA</span>
              <span className="ml-1 text-2xl font-light text-white/30">GPT</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-gray-500">Create your free account</p>
        </div>

        <div className="p-8 border shadow-2xl bg-gray-900/60 border-white/8 rounded-2xl backdrop-blur-sm">
          <h2 className="mb-6 text-xl font-bold">Sign Up</h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 text-sm placeholder-gray-600 transition-all border bg-gray-800/60 border-white/8 rounded-xl focus:outline-none focus:border-green-500/50 focus:bg-gray-800"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm placeholder-gray-600 transition-all border bg-gray-800/60 border-white/8 rounded-xl focus:outline-none focus:border-green-500/50 focus:bg-gray-800"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-sm placeholder-gray-600 transition-all border bg-gray-800/60 border-white/8 rounded-xl focus:outline-none focus:border-green-500/50 focus:bg-gray-800"
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          passwordStrength >= level ? strengthBg[passwordStrength] : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[10px] mt-1 ${strengthColor[passwordStrength]}`}>
                    {strengthLabel[passwordStrength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800/60 border rounded-xl text-sm focus:outline-none transition-all placeholder-gray-600 ${
                  passwordsMismatch
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-white/8 focus:border-green-500/50 focus:bg-gray-800"
                }`}
                autoComplete="new-password"
              />
              {passwordsMismatch && (
                <p className="text-[10px] text-red-400 mt-1">Passwords don&apos;t match</p>
              )}
            </div>

            {err && (
              <div className="text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2.5">
                ⚠ {err}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                canSubmit
                  ? "bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
                  : "bg-green-500/20 text-green-500/40 cursor-not-allowed"
              }`}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="pt-5 mt-5 text-center border-t border-white/5">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-green-400 transition-colors hover:text-green-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-xs text-center text-gray-600">
          Or{" "}
          <Link href="/chat" className="text-gray-400 transition-colors hover:text-white">
            continue as guest →
          </Link>
        </p>
      </div>
    </div>
  );
}
