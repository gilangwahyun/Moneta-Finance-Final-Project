/********** Imports **********/
import React from "react";
import { Banknote, Building2, Smartphone, TrendingUp, Wallet } from "lucide-react";
import { WalletType } from "@/types/models.types";

/********** Constants **********/
const walletIconMap: Record<WalletType, React.FC<{ className?: string }>> = {
  TUNAI:     Banknote,
  BANK:      Building2,
  E_WALLET:  Smartphone,
  INVESTASI: TrendingUp,
  LAINNYA:   Wallet,
};

/********** Helpers **********/
/**
 * Get the Lucide icon element for a given wallet type.
 * Used by the visual wallet selector.
 *
 * @param type - The type of the wallet.
 * @param className - Optional Tailwind classes to apply to the icon.
 * @returns A React element representing the wallet icon.
 */
export function getWalletIcon(
  type: WalletType,
  className?: string
): React.ReactElement {
  const Icon = walletIconMap[type] ?? Wallet;
  return <Icon className={className} />;
}
