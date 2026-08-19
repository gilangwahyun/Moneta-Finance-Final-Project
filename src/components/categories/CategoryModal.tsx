import { useState, useEffect, FormEvent, useRef } from "react";
import { X, TrendingDown, TrendingUp, Check } from "lucide-react";
import { Category, CategoryType } from "@/types/models.types";
import { useCategories } from "@/hooks/use-categories";
import { AVAILABLE_ICONS } from "@/lib/available-icons";
import { showSyncToast } from "@/lib/utils/show-toast";

const CATEGORY_COLORS = [
  { label: "Merah",    hex: "#ef4444" },
  { label: "Oranye",   hex: "#f97316" },
  { label: "Kuning",   hex: "#eab308" },
  { label: "Hijau",    hex: "#22c55e" },
  { label: "Toska",    hex: "#14b8a6" },
  { label: "Biru",     hex: "#3b82f6" },
  { label: "Ungu",     hex: "#8b5cf6" },
  { label: "Pink",     hex: "#ec4899" },
];

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  initialType?: CategoryType;
}

export function CategoryModal({ isOpen, onClose, editingCategory, initialType = "EXPENSE" }: CategoryModalProps) {
  const { addCategory, editCategory } = useCategories();

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CategoryType>(initialType);
  const [formColor, setFormColor] = useState(CATEGORY_COLORS[5].hex);
  const [formIcon, setFormIcon] = useState(AVAILABLE_ICONS[0].name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const prevIsOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      if (editingCategory) {
        setFormName(editingCategory.name);
        setFormType(editingCategory.type);
        setFormColor(editingCategory.color || CATEGORY_COLORS[5].hex);
        setFormIcon(editingCategory.icon || AVAILABLE_ICONS[0].name);
      } else {
        setFormName("");
        setFormType(initialType);
        setFormColor(CATEGORY_COLORS[5].hex);
        setFormIcon(AVAILABLE_ICONS[0].name);
      }
      setTimeout(() => nameRef.current?.focus(), 50);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, editingCategory, initialType]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await editCategory({
          clientId: editingCategory.clientId,
          name: formName.trim(),
          type: formType,
          icon: formIcon,
          color: formColor,
        });
        showSyncToast("Kategori diperbarui", "Disimpan luring. Akan disinkronkan saat terhubung.");
      } else {
        await addCategory({
          name: formName.trim(),
          type: formType,
          icon: formIcon,
          color: formColor,
        });
        showSyncToast("Kategori dibuat", "Disimpan luring. Akan disinkronkan saat terhubung.");
      }
      onClose();
    } catch (error) {
      console.error("Form submit error:", error);
      showSyncToast("Gagal menyimpan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const previewIconEntry = AVAILABLE_ICONS.find((i) => i.name === formIcon) ?? AVAILABLE_ICONS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60" onClick={onClose} />
      
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:max-w-md sm:rounded-2xl sm:slide-in-from-bottom-0 sm:fade-in flex flex-col">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-5 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: formColor + "22", border: `2px solid ${formColor}` }}>
              <previewIconEntry.Icon className="h-5 w-5" style={{ color: formColor }} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {editingCategory ? "Ubah Kategori" : "Kategori Baru"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Nama Kategori
            </label>
            <input
              ref={nameRef}
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Contoh: Makan & Minum"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {!editingCategory && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Tipe
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormType("EXPENSE")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    formType === "EXPENSE"
                      ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500 shadow-md shadow-indigo-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <TrendingDown className="h-4 w-4" /> Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("INCOME")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    formType === "INCOME"
                      ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 shadow-md shadow-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" /> Pemasukan
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Warna
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => {
                const isSelected = c.hex === formColor;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setFormColor(c.hex)}
                    className={`relative h-9 w-9 rounded-full transition-all active:scale-90 ${
                      isSelected ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Ikon
            </p>
            <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1 pb-1">
              {AVAILABLE_ICONS.map((entry) => {
                const isSelected = entry.name === formIcon;
                return (
                  <button
                    key={entry.name}
                    type="button"
                    aria-label={entry.label}
                    onClick={() => setFormIcon(entry.name)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-medium transition-all active:scale-95 ${
                      isSelected
                        ? "border-transparent text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                    style={isSelected ? { backgroundColor: formColor, borderColor: formColor } : {}}
                  >
                    <entry.Icon className="h-4 w-4 shrink-0" />
                    <span className="leading-tight truncate w-full text-center px-0.5">{entry.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isSubmitting || !formName.trim()}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 sm:w-auto sm:flex-1"
              style={{ backgroundColor: formColor }}
            >
              {isSubmitting && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {editingCategory ? "Simpan Perubahan" : "Simpan Kategori"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto sm:flex-1"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
