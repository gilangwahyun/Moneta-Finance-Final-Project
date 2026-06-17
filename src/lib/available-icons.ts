//********** START: Available Icons Library **********
//********** Curated list of Lucide icons suitable for finance categories.
//********** Used by CategoryBuilder's icon picker grid.
//**********
//********** Each entry: { name: string (key stored in DB), Icon: Lucide component }
//********** The `name` string is stored as category.icon in IndexedDB.
//********** getCategoryIcon() in icons.tsx can render it by name via the icon map.
//********** END: Available Icons Library **********

import {
  Utensils,
  Coffee,
  Car,
  ShoppingBag,
  ShoppingCart,
  Zap,
  HeartPulse,
  BookOpen,
  Briefcase,
  Film,
  Gift,
  Home,
  Plane,
  Smartphone,
  PiggyBank,
  TrendingUp,
  Wallet,
  CreditCard,
  Dumbbell,
  Music,
  Baby,
  PawPrint,
  Shirt,
  Scissors,
  UtensilsCrossed,
  Beer,
  Bus,
  Fuel,
  Gamepad2,
  Stethoscope,
} from "lucide-react";
import React from "react";

//********** TYPES **********
export interface AvailableIcon {
  //********** Key stored in IndexedDB as category.icon
  name: string;
  //********** Lucide component to render
  Icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  //********** Human-readable label shown in picker
  label: string;
}

export const AVAILABLE_ICONS: AvailableIcon[] = [
  { name: "utensils",         Icon: Utensils,        label: "Makanan" },
  { name: "coffee",           Icon: Coffee,           label: "Minuman" },
  { name: "utensils-crossed", Icon: UtensilsCrossed,  label: "Restoran" },
  { name: "beer",             Icon: Beer,             label: "Cafe/Bar" },
  { name: "car",              Icon: Car,              label: "Kendaraan" },
  { name: "bus",              Icon: Bus,              label: "Transportasi" },
  { name: "fuel",             Icon: Fuel,             label: "Bensin" },
  { name: "plane",            Icon: Plane,            label: "Perjalanan" },
  { name: "shopping-bag",     Icon: ShoppingBag,      label: "Belanja" },
  { name: "shopping-cart",    Icon: ShoppingCart,     label: "Groceries" },
  { name: "shirt",            Icon: Shirt,            label: "Pakaian" },
  { name: "scissors",         Icon: Scissors,         label: "Perawatan" },
  { name: "zap",              Icon: Zap,              label: "Tagihan" },
  { name: "home",             Icon: Home,             label: "Tempat Tinggal" },
  { name: "smartphone",       Icon: Smartphone,       label: "Langganan" },
  { name: "heart-pulse",      Icon: HeartPulse,       label: "Kesehatan" },
  { name: "stethoscope",      Icon: Stethoscope,      label: "Medis" },
  { name: "book-open",        Icon: BookOpen,         label: "Pendidikan" },
  { name: "briefcase",        Icon: Briefcase,        label: "Kerja" },
  { name: "film",             Icon: Film,             label: "Hiburan" },
  { name: "gamepad2",         Icon: Gamepad2,         label: "Gaming" },
  { name: "music",            Icon: Music,            label: "Musik" },
  { name: "dumbbell",         Icon: Dumbbell,         label: "Olahraga" },
  { name: "gift",             Icon: Gift,             label: "Hadiah" },
  { name: "baby",             Icon: Baby,             label: "Anak" },
  { name: "paw-print",        Icon: PawPrint,         label: "Hewan Peliharaan" },
  { name: "wallet",           Icon: Wallet,           label: "Dompet" },
  { name: "credit-card",      Icon: CreditCard,       label: "Kartu" },
  { name: "piggy-bank",       Icon: PiggyBank,        label: "Tabungan" },
  { name: "trending-up",      Icon: TrendingUp,       label: "Investasi" },
];
