// ─── Default Categories ─────────────────────────────────
// System default category definitions, copied to each new user
// on registration. Extracted here to avoid importing from the
// seed script (which has side-effect top-level code).

export interface DefaultCategory {
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Expense
  { name: "Makanan",          type: "EXPENSE", icon: "utensils",      color: "#EF4444" },
  { name: "Transportasi",     type: "EXPENSE", icon: "bus",           color: "#F59E0B" },
  { name: "Tempat Tinggal",   type: "EXPENSE", icon: "home",          color: "#6366F1" },
  { name: "Tagihan",          type: "EXPENSE", icon: "zap",           color: "#8B5CF6" },
  { name: "Belanja Harian",   type: "EXPENSE", icon: "shopping-cart", color: "#10B981" },
  { name: "Hiburan",          type: "EXPENSE", icon: "film",          color: "#EC4899" },
  { name: "Kesehatan",        type: "EXPENSE", icon: "heart-pulse",   color: "#14B8A6" },
  { name: "Pendidikan",       type: "EXPENSE", icon: "book-open",     color: "#3B82F6" },
  { name: "Belanja",          type: "EXPENSE", icon: "shopping-bag",  color: "#F97316" },
  { name: "Jajan",            type: "EXPENSE", icon: "coffee",        color: "#A855F7" },
  { name: "Langganan",        type: "EXPENSE", icon: "smartphone",    color: "#64748B" },
  { name: "Pengeluaran Lain", type: "EXPENSE", icon: "credit-card",   color: "#94A3B8" },
  
  // Income
  { name: "Gaji",             type: "INCOME",  icon: "wallet",        color: "#22C55E" },
  { name: "Freelance",        type: "INCOME",  icon: "briefcase",     color: "#06B6D4" },
  { name: "Investasi",        type: "INCOME",  icon: "trending-up",   color: "#8B5CF6" },
  { name: "Hadiah",           type: "INCOME",  icon: "gift",          color: "#F43F5E" },
  { name: "Pemasukan Lain",   type: "INCOME",  icon: "piggy-bank",    color: "#84CC16" },
];
