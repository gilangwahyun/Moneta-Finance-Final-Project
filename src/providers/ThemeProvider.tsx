/*
 * File: src/providers/ThemeProvider.tsx
 * Description: Penyedia tema aplikasi (terang, gelap, atau mengikuti sistem) berbasis next-themes dengan perlindungan ketidakcocokan hidrasi (hydration mismatch).
 */

'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Merender penyedia tema untuk mendukung mode gelap/terang secara konsisten tanpa flash unstyled content.
 *
 * @param props - Properti anak komponen yang dibungkus tema
 * @returns Elemen JSX penyedia tema next-themes
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  /* Mencegah ketidakcocokan hidrasi (hydration mismatch) dengan menunggu komponen dimuat di peramban */
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    /* Mengembalikan elemen tersembunyi sementara untuk mencegah kilasan konten yang belum bergaya (FOUC) */
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  /********** [START: Perenderan Penyedia Tema Aplikasi] **********/
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
  /********** [END: Perenderan Penyedia Tema Aplikasi] **********/
}
