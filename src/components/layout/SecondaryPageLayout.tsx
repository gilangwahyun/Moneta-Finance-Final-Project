//********** START: SecondaryPageLayout **********
//********** Reusable layout wrapper for all secondary/settings pages.
//********** Provides a consistent header with back navigation, title,
//********** description, and a constrained max-w-3xl content column.
//********** END: SecondaryPageLayout **********

'use client';

//********** IMPORTS **********

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

//********** TYPES **********
interface SecondaryPageLayoutProps {
  title: string;
  description: string;
  backRoute: string;
  //********** Optional CTA button rendered in the top-right of the header
  headerAction?: ReactNode;
  children: ReactNode;
}

//********** COMPONENT **********
/**
 * Reusable layout wrapper for all secondary/settings pages.
 * @param title - The title of the page
 * @param description - A short description displayed under the title
 * @param backRoute - The route to navigate when back is clicked
 * @param headerAction - Optional action element in the header
 * @param children - The content of the page
 * @returns The rendered layout element
 */
export function SecondaryPageLayout({ title, description, backRoute, headerAction, children }: SecondaryPageLayoutProps) {
  const router = useRouter();

  return (
    <div className="w-full max-w-[100vw] sm:max-w-3xl mx-auto min-h-screen overflow-x-hidden -mt-6 md:mt-0">
      {/* //********** Page Header ********** */}
      <div className="relative z-20 mb-6 md:mb-8 -mx-4 px-4 pb-3 pt-7 bg-slate-50/90 dark:bg-slate-950/90 md:mx-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0 md:dark:bg-transparent">
        {/* //********** Back + Title row ********** */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-4 min-w-0">
            {/* //********** Back button ********** */}
            <button
              onClick={() => router.push(backRoute)}
              aria-label="Kembali"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* //********** Title + description ********** */}
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>

          {/* //********** Optional right-side CTA ********** */}
          {headerAction && <div className="w-full md:w-auto mt-2 md:mt-0">{headerAction}</div>}
        </div>

        {/* //********** Subtle divider ********** */}
        <div className="h-px w-full bg-slate-100 dark:bg-slate-800/60" />
      </div>

      {/* //********** Page Content ********** */}
      {children}
    </div>
  );
}
