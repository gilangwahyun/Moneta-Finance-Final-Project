// ─── Halaman Masuk ──────────────────────────────────────
// Menangani autentikasi pengguna. Mendukung login menggunakan
// email ATAU username. Setelah berhasil, sesi disimpan ke
// IndexedDB dan pengguna diarahkan ke dashboard.

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthUser } from "@/hooks/use-auth-user";
import { User } from "@/types/models.types";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { upsertLocalUser } = useAuthUser();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });

      const result = await res.json();

      if (res.status === 429) {
        throw new Error(result.error?.message || "Terlalu banyak percobaan. Silakan coba lagi nanti.");
      }

      if (!res.ok) {
        throw new Error(result.error?.message || "Login gagal.");
      }

      // Simpan sesi pengguna ke IndexedDB
      const userData: User = result.data.user;
      await upsertLocalUser(userData);

      // Arahkan ke dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            Moneta
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Selamat datang kembali! Silakan masuk ke akunmu.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* ── Identitas (email atau username) ── */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Identitas
              </label>
              <input
                id="identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Email atau username"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Masukkan alamat email atau username kamu.
              </p>
            </div>

            {/* ── Kata Sandi ── */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Kata Sandi
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sedang masuk...
                </span>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">
            Kredensial Demo
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
            user_test@moneta.app / password123
          </p>
        </div>
      </div>
    </main>
  );
}
