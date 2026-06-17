//********** START: TransactionItem **********
//********** Bug 4 Fix: Removed raw Unicode '-' (U+2212 minus sign) that
//**********   caused Â- encoding corruption. Now uses safe ASCII '-' prefix.
//********** Bug 5 Fix: Added category color dot indicator so category colors
//**********   are visible outside the Management screen.
//********** END: TransactionItem **********

import { Transaction } from '@/types/models.types';
import { formatCurrency, formatDate } from '@/lib/utils/helpers';
import { getCategoryIcon } from '@/lib/utils/icons';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { EntityActionMenu } from '@/components/ui/EntityActionMenu';

//********** TYPES **********

interface TransactionItemProps {
  transaction: Transaction;
  categoryName?: string;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  onEdit?: (txn: Transaction) => void;
  onDelete?: (txn: Transaction) => void;
}

//********** COMPONENT **********
/**
 * Renders a single transaction item row.
 */
export function TransactionItem({
  transaction,
  categoryName = 'Transaksi',
  categoryColor,
  categoryIcon,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = transaction.type === 'TRANSFER';

  return (
    <div className="group relative flex w-full min-w-0 items-center justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 bg-white transition-all hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
      {/* Mobile touch target for opening action menu (overlay) */}
      <div
        className="absolute inset-0 z-0 sm:hidden"
        onClick={(e) => {
          const btn = e.currentTarget.parentElement?.querySelector('[aria-label="Buka menu aksi"]') as HTMLButtonElement;
          if (btn) btn.click();
        }}
      />

      <div className="relative z-10 flex flex-1 min-w-0 items-center gap-3 pointer-events-none sm:pointer-events-auto">
        {/* //********** Dynamic icon ********** */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          {(() => {
            const iconName = categoryIcon || transaction.category?.icon;
            return iconName ? (
              <DynamicIcon iconName={iconName} color={categoryColor} className="h-5 w-5" />
            ) : (
              getCategoryIcon(categoryName, 'h-5 w-5', categoryColor)
            );
          })()}
        </div>

        {/* //********** Name & Date ********** */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate flex-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
              {transaction.description || categoryName || 'Transaksi'}
            </span>
            {transaction.syncStatus === 'PENDING' && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                Tertunda
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {formatDate(transaction.date, transaction.createdAt)}
          </p>
        </div>
      </div>

      {/* //********** Amount & Actions ********** */}
      <div className="relative z-10 flex shrink-0 items-center gap-2 sm:gap-3 pointer-events-none sm:pointer-events-auto">
        <span
          className={`whitespace-nowrap text-right text-[15px] font-bold ${
            isIncome
              ? 'text-emerald-600 dark:text-emerald-400'
              : isTransfer
                ? 'text-slate-600 dark:text-slate-300'
                : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {isIncome ? '+' : isTransfer ? '' : '-'}
          {formatCurrency(Number(transaction.amount))}
        </span>

        {/* Action Menu */}
        {(onEdit || onDelete) && (
          <div className="pointer-events-auto flex shrink-0 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
            <EntityActionMenu
              title={transaction.description || categoryName || 'Transaksi'}
              subtitle={`${formatDate(transaction.date, transaction.createdAt)} • ${formatCurrency(Number(transaction.amount))}`}
              onEdit={() => onEdit?.(transaction)}
              onDelete={() => onDelete?.(transaction)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
