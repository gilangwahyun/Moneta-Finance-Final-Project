/*
 * File: src/lib/utils/parse-mutation.ts
 * Description: Utilitas murni sisi klien untuk mengekstrak nominal uang rupiah (IDR)
 * dari teks mentah SMS m-banking, notifikasi push, atau resi transaksi dengan pendekatan offline-first.
 */

/********** Pola Pengecualian (Exclusion Patterns) **********/
const EXCLUSION_PATTERNS: RegExp[] = [
  /********** Format waktu ISO-8601 lengkap, misal: 2024-05-13T09:30:00. */
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,
  /********** Format tanggal Indonesia: 13/05/2024, 13-05-2024, 13.05.2024. */
  /\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b/g,
  /********** Format tanggal pendek dengan tahun di awal: 2024/05/13. */
  /\b\d{4}[/.\-]\d{2}[/.\-]\d{2}\b/g,
  /********** Format waktu (jam dan menit): 09:30, 09:30:12. */
  /\b\d{1,2}:\d{2}(?::\d{2})?\b/g,
  /********** Nomor rekening atau kartu (>= 10 digit berurutan atau kelompok digit dengan spasi). */
  /\b\d{10,}\b/g,
  /\b(?:\d{4} ){3}\d{4}\b/g,
  /********** ID referensi atau transaksi yang mencampurkan huruf dan angka. */
  /\b[A-Z]{1,6}[-:]?\d{6,}\b/gi,
  /\b\d{6,}[A-Z]{1,6}\b/gi,
  /********** Nomor referensi gaya BCA, misal: "NO. REF: 123456789012345". */
  /\bNO\.?\s*REF[:\s]+[\w\d]+/gi,
  /\bREFERENCE[:\s]+[\w\d]+/gi,
  /********** Baris informasi saldo (Saldo, Sisa Saldo, Saldo Akhir, Balance, Sisa) agar tidak salah pilih sebagai nominal transaksi. */
  /\b(?:SISA\s+)?SALDO(?:\s+\w+)?\s*[:=-]?\s*(?:Rp\.?|IDR)?\s*[\d,.]+/gi,
  /\b(?:AVAIL\s+)?BALANCE(?:\s+\w+)?\s*[:=-]?\s*(?:Rp\.?|IDR)?\s*[\d,.]+/gi,
  /\bSISA\s*[:=-]?\s*(?:Rp\.?|IDR)?\s*[\d,.]+/gi,
];

/********** Pola Nominal Uang (Amount Patterns) **********/
const AMOUNT_PATTERNS: RegExp[] = [
  /********** Awalan "Rp" atau "IDR" - format pemisah ribuan titik (Gaya Indonesia). */
  /(?:Rp\.?|IDR)\s*([\d]{1,3}(?:\.[\d]{3})+(?:,\d{1,2})?)/gi,

  /********** Awalan "Rp" atau "IDR" - format pemisah ribuan koma (Gaya Barat). */
  /(?:Rp\.?|IDR)\s*([\d]{1,3}(?:,[\d]{3})+(?:\.\d{1,2})?)/gi,

  /********** Awalan "Rp" atau "IDR" - angka bulat tanpa karakter pemisah. */
  /(?:Rp\.?|IDR)\s*(\d{4,})/gi,

  /********** Nominal dengan kata kunci pendahulu (Nominal, Jumlah, Tagihan, Transfer, dll). */
  /(?:Nominal|Jumlah|Amount|Total|Tagihan|Debit|Kredit|Transfer|Pembayaran)[:\s]+(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/gi,

  /********** Nominal bergaya Indonesia tanpa awalan (pilihan terakhir, minimal format X.XXX). */
  /\b(\d{1,3}(?:\.\d{3})+)\b/g,
];

/********** Normalisasi Nominal & Ekstraksi **********/

/**
 * Mengonversi string angka terdeteksi menjadi bilangan bulat rupiah murni.
 * Menangani notasi Indonesia (titik = ribuan, koma = desimal) dan Barat (koma = ribuan, titik = desimal).
 *
 * @param raw - String angka mentah hasil regex.
 * @returns Nominal bilangan bulat rupiah.
 */
function normalizeAmount(raw: string): number {
  /********** Bersihkan sisa karakter awalan mata uang atau spasi. */
  const s = raw.trim();

  /********** Deteksi gaya penulisan berdasarkan posisi karakter pemisah terakhir. */
  const lastDot   = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  let normalized: string;

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      /********** Notasi Indonesia: titik sebagai ribuan, koma sebagai desimal. */
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      /********** Notasi Barat: koma sebagai ribuan, titik sebagai desimal. */
      normalized = s.replace(/,/g, "");
    }
  } else {
    /********** Tanpa pemisah atau hanya satu jenis -> perlakukan sebagai bilangan bulat. */
    normalized = s.replace(/[,\.]/g, "");
  }

  const value = parseFloat(normalized);
  /********** Bulatkan ke bawah untuk mengambil nominal rupiah utuh (abaikan sen/desimal). */
  return isNaN(value) ? 0 : Math.floor(value);
}

/**
 * Mengekstrak nominal rupiah (IDR) valid terbesar dari teks mentah notifikasi atau resi perbankan.
 *
 * @param text - Teks mentah dari SMS, push notification, atau salinan resi.
 * @returns Nominal terbesar yang terdeteksi sebagai bilangan bulat, atau null jika tidak ditemukan.
 *
 * @example
 * parseMutationText("BCA - Debit Rp50.000 dari rek 123456789")
 * // -> 50000
 *
 * parseMutationText("Transfer Rp1.500.000,00 ke Rek 987654321 berhasil")
 * // -> 1500000
 */
export function parseMutationText(text: string): number | null {
  if (!text || typeof text !== "string") return null;

  /********** 1. Sanitasi: ganti pola pengecualian dengan spasi untuk mencegah kebocoran angka. */
  let sanitized = text;
  for (const pattern of EXCLUSION_PATTERNS) {
    sanitized = sanitized.replace(pattern, " ");
  }

  /********** 2. Kumpulkan seluruh kandidat angka yang cocok. */
  const candidates: number[] = [];

  for (const pattern of AMOUNT_PATTERNS) {
    /********** Selalu reset lastIndex pada regex global. */
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sanitized)) !== null) {
      const raw = match[1] ?? match[0];
      const value = normalizeAmount(raw);
      /********** Hanya terima nominal >= 1 (filter angka nol atau gangguan). */
      if (value >= 1) {
        candidates.push(value);
      }
    }
  }

  if (candidates.length === 0) return null;

  /********** 3. Kembalikan kandidat terbesar (kemungkinan besar adalah nominal transfer, bukan biaya admin atau saldo). */
  return Math.max(...candidates);
}
