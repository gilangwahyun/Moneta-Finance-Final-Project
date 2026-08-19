/********** Imports **********/
import React from "react";
import {
  Utensils,
  Film,
  Wallet,
  Car,
  Home,
  ShoppingBag,
  HeartPulse,
  BookOpen,
  Briefcase,
  Gift,
  Zap,
  Coffee,
  Plane,
  Smartphone,
  HelpCircle,
  PiggyBank,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Star,
} from "lucide-react";

/********** Types **********/
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

/********** Constants **********/
/**
 * Icon map mapping category names to Lucide React components.
 * Indonesian categories from seed.ts are the primary keys.
 */
const categoryIconMap: Record<string, React.FC<IconProps>> = {
  /********** Indonesian (primary - matches seed.ts) */
  "makanan": Utensils,
  "jajan": Coffee,
  "transportasi": Car,
  "tempat tinggal": Home,
  "tagihan": Zap,
  "belanja harian": ShoppingCart,
  "belanja": ShoppingBag,
  "hiburan": Film,
  "kesehatan": HeartPulse,
  "pendidikan": BookOpen,
  "pakaian": ShoppingBag,
  "langganan": Smartphone,
  "pengeluaran lain": CreditCard,
  "gaji": Wallet,
  "freelance": Briefcase,
  "investasi": TrendingUp,
  "hadiah": Gift,
  "pemasukan lain": PiggyBank,

  /********** English (legacy / fallback) */
  "food & dining": Utensils,
  "food": Utensils,
  "dining": Utensils,
  "coffee": Coffee,
  "entertainment": Film,
  "movies": Film,
  "salary": Wallet,
  "income": Wallet,
  "transportation": Car,
  "transit": Car,
  "housing": Home,
  "rent": Home,
  "shopping": ShoppingBag,
  "groceries": ShoppingCart,
  "health": HeartPulse,
  "medical": HeartPulse,
  "education": BookOpen,
  "work": Briefcase,
  "business": Briefcase,
  "gifts": Gift,
  "utilities": Zap,
  "travel": Plane,
  "technology": Smartphone,
  "electronics": Smartphone,
  "savings": PiggyBank,
  "investment": TrendingUp,
  "subscription": Smartphone,
  "other": CreditCard,
};

/********** Helpers **********/
/**
 * Returns a category icon element based on the category name.
 * Applies the category brand color to the icon's text color.
 * Includes fuzzy matching to support legacy English names and partial matches.
 *
 * @param categoryName - Name of the category (Indonesian or English).
 * @param className - Optional Tailwind class string for sizing/styling.
 * @param color - Optional hex color applied as an inline style.
 * @returns A React element rendering the matched icon.
 */
export function getCategoryIcon(
  categoryName: string | undefined | null,
  className?: string,
  color?: string | null
) {
  const style: React.CSSProperties | undefined = color
    ? { color }
    : undefined;

  if (!categoryName) {
    return <HelpCircle className={className} style={style} />;
  }

  /********** Normalize: lowercase + trim for robust matching. */
  const lowerName = categoryName.toLowerCase().trim();

  /********** Exact normalized match first. */
  if (categoryIconMap[lowerName]) {
    const Icon = categoryIconMap[lowerName];
    return <Icon className={className} style={style} />;
  }

  /********** Fuzzy match: category name contains a key, or key contains category name. */
  for (const [key, Icon] of Object.entries(categoryIconMap)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return <Icon className={className} style={style} />;
    }
  }

  /********** Default fallback. */
  return <HelpCircle className={className} style={style} />;
}
