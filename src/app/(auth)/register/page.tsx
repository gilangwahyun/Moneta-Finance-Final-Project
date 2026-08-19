// ─── Halaman Daftar ──────────────────────────────────────
// Menangani pendaftaran pengguna baru. Setelah berhasil,
// menyimpan sesi pengguna ke IndexedDB dan mengarahkan ke dashboard.

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthUser } from "@/hooks/use-auth-user";
import { User } from "@/types/models.types";
import { Eye, EyeOff, FlaskConical } from "lucide-react";
import { clearLocalCache } from "@/lib/local-db/cache-manager";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [seedDemoData, setSeedDemoData] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { upsertLocalUser } = useAuthUser();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Kata sandi dan konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, username, password, seedDemoData }),
      });

      const result = await res.json();

      if (res.status === 429) {
        throw new Error(result.error?.message || "Terlalu banyak percobaan. Silakan coba lagi nanti.");
      }

      if (!res.ok) {
        throw new Error(result.error?.message || "Pendaftaran gagal.");
      }

      // Bersihkan sisa data atau antrian IndexedDB dari sesi/akun pengujian sebelumnya
      await clearLocalCache();

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
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            Moneta
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Mulai perjalanan keuanganmu bersama kami.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {/* ── Email ── */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="nama@email.com"
              />
            </div>

            {/* ── Username ── */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Nama Pengguna (Username)
              </label>
              <input
                id="username"
                type="text"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                title="Hanya huruf, angka, dan garis bawah"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Pilih username unikmu"
              />
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                3–30 karakter. Huruf, angka, dan garis bawah saja.
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
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Min. 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ── Konfirmasi Kata Sandi ── */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Konfirmasi Kata Sandi
              </label>
              <div className="relative mt-1">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Ulangi kata sandi"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ── Opsi Seeding Data (Mode Evaluasi / Usability Testing) ── */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 transition-all dark:border-indigo-900/50 dark:bg-indigo-950/40">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="seed-demo-data"
                  type="checkbox"
                  checked={seedDemoData}
                  onChange={(e) => setSeedDemoData(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-indigo-900 dark:text-indigo-200">
                    <FlaskConical className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Aktifkan Mode Skenario Uji (Data Simulasi Otomatis)
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-indigo-700 dark:text-indigo-300">
                    Khusus evaluasi kebergunaan: Akun barumu langsung diisi dengan ±60 transaksi simulasi (Anggaran, Dompet, Pengeluaran & Target) agar fitur analitik dan notifikasi perilaku langsung aktif tanpa perlu mengisi manual.
                  </p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95 focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Membuat akun...
                </span>
              ) : (
                "Buat Akun"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
