/*
 * File: src/components/layout/SecondaryPageLayout.tsx
 * Description: Tata letak pembungkus untuk halaman sekunder/pengaturan dengan navigasi kembali, judul, dan lebar kolom konten yang seragam.
 */

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface SecondaryPageLayoutProps {
  title: string;
  description: string;
  backRoute: string;
  /* Tombol aksi CTA opsional di sudut kanan header */
  headerAction?: ReactNode;
  children: ReactNode;
}

/**
 * Merender tata letak standar halaman sekunder dengan header konsisten dan navigasi kembali.
 *
 * @param props - Properti tata letak sekunder
 * @returns Elemen JSX tata letak sekunder
 */
export function SecondaryPageLayout({ title, description, backRoute, headerAction, children }: SecondaryPageLayoutProps) {
  const router = useRouter();

  /********** [START: Perenderan Tata Letak Halaman Sekunder] **********/
  return (
    <div className="w-full max-w-[100vw] sm:max-w-3xl mx-auto min-h-screen overflow-x-hidden -mt-6 md:mt-0">
      {/* Header Halaman Sekunder */}
      <div className="relative z-20 mb-6 md:mb-8 -mx-4 px-4 pb-3 pt-7 bg-slate-50/90 dark:bg-slate-950/90 md:mx-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0 md:dark:bg-transparent">
        {/* Baris Tombol Kembali dan Judul */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-4 min-w-0">
            {/* Tombol Kembali ke rute sebelumnya */}
            <button
              onClick={() => router.push(backRoute)}
              aria-label="Kembali"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Judul + deskripsi halaman */}
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>
            </div>
          </div>

          {/* Tombol aksi CTA opsional */}
          {headerAction && <div className="w-full md:w-auto mt-2 md:mt-0">{headerAction}</div>}
        </div>

        {/* Garis pemisah halus */}
        <div className="h-px w-full bg-slate-100 dark:bg-slate-800/60" />
      </div>

      {/* Konten Utama Halaman */}
      {children}
    </div>
  );
  /********** [END: Perenderan Tata Letak Halaman Sekunder] **********/
}
