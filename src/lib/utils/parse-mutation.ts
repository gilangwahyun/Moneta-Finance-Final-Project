//********** START: parseMutationText **********
//********** Pure client-side utility to extract an IDR nominal amount
//********** from raw m-banking SMS / push-notification / receipt text.
//**********
//********** Design goals:
//**********   1. OFFLINE FIRST - zero network calls, zero external deps.
//**********   2. SMART exclusion - ignores dates, transaction IDs,
//**********      account/card numbers, and reference codes.
//**********   3. MULTI-FORMAT - handles Indonesian (dot-separator) AND
//**********      Western (comma-separator) notation, with or without
//**********      currency prefixes.
//**********   4. LARGEST-WINS - when several amounts are found, the
//**********      largest is selected (the transfer/debit amount, not
//**********      the balance remnant or a fee).
//**********
//********** Supported input patterns (examples):
//**********   "Rp50.000"          -> 50000
//**********   "Rp 50,000.00"      -> 50000
//**********   "Rp. 1.500.000"     -> 1500000
//**********   "IDR 250.000"       -> 250000
//**********   "50.000"            -> 50000  (bare Indonesian notation)
//**********   "1,500,000.00"      -> 1500000 (bare Western notation)
//**********   "Nominal: 750.000"  -> 750000
//**********   "Trx: BCA-2024..., Rp75.000" -> 75000 (ID noise stripped)
//**********
//********** Returns null if no valid amount >= 1 is found.
//********** END: parseMutationText **********

//********** Pre-compiled exclusion patterns (applied BEFORE amount search)
const EXCLUSION_PATTERNS: RegExp[] = [
  //********** Full ISO-8601 date-times, e.g. 2024-05-13T09:30:00
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,
  //********** Indonesian date formats: 13/05/2024, 13-05-2024, 13.05.2024
  /\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b/g,
  //********** Short year-first dates: 2024/05/13
  /\b\d{4}[/.\-]\d{2}[/.\-]\d{2}\b/g,
  //********** Time values: 09:30, 09:30:12
  /\b\d{1,2}:\d{2}(?::\d{2})?\b/g,
  //********** Account / card numbers (>=10 consecutive digits or digit-groups separated by spaces)
  //********** e.g. "1234567890", "1234 5678 9012 3456"
  /\b\d{10,}\b/g,
  /\b(?:\d{4} ){3}\d{4}\b/g,
  //********** Reference / transaction IDs that mix letters and digits
  //********** e.g. "TXN-ABC12345", "REF:20240513001"
  /\b[A-Z]{1,6}[-:]?\d{6,}\b/gi,
  /\b\d{6,}[A-Z]{1,6}\b/gi,
  //********** BCA-style noref: e.g. "123456789012345"
  /\bNO\.?\s*REF[:\s]+[\w\d]+/gi,
  /\bREFERENCE[:\s]+[\w\d]+/gi,
  //********** Account balance lines (Saldo, Sisa Saldo, Saldo Akhir, Saldo Rekening, Balance, Sisa)
  //********** Strip these out so Math.max doesn't pick account balance over transaction amount!
  /\b(?:SISA\s+)?SALDO(?:\s+\w+)?\s*[:=-]?\s*(?:Rp\.?|IDR)?\s*[\d,.]+/gi,
  /\b(?:AVAIL\s+)?BALANCE(?:\s+\w+)?\s*[:=-]?\s*(?:Rp\.?|IDR)?\s*[\d,.]+/gi,
  /\bSISA\s*[:=-]?\s*(?:Rp\.?|IDR)?\s*[\d,.]+/gi,
];

//********** START: AMOUNT_PATTERNS **********
//********** Patterns that identify a token as an IDR amount.
//********** Each pattern must capture the numeric portion in group 1.
//********** Priority order matters - more specific patterns first.
//********** END: AMOUNT_PATTERNS **********
const AMOUNT_PATTERNS: RegExp[] = [
  //********** "Rp" or "IDR" prefix - Indonesian dot-thousands, optional comma-cents
  //********** e.g. Rp1.500.000,00  |  Rp. 1.500.000  |  IDR 1.500.000,00
  /(?:Rp\.?|IDR)\s*([\d]{1,3}(?:\.[\d]{3})+(?:,\d{1,2})?)/gi,

  //********** "Rp" or "IDR" prefix - Western comma-thousands, optional dot-cents
  //********** e.g. Rp 1,500,000.00  |  IDR 1,500.00
  /(?:Rp\.?|IDR)\s*([\d]{1,3}(?:,[\d]{3})+(?:\.\d{1,2})?)/gi,

  //********** "Rp" or "IDR" prefix - plain integer (no separator)
  //********** e.g. Rp50000  |  IDR 50000
  /(?:Rp\.?|IDR)\s*(\d{4,})/gi,

  //********** Keyword-prefixed bare amounts (Indonesian dot-thousands)
  //********** e.g. "Nominal: 50.000", "Jumlah: 1.500.000,00"
  /(?:Nominal|Jumlah|Amount|Total|Tagihan|Debit|Kredit|Transfer|Pembayaran)[:\s]+(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)/gi,

  //********** Bare Indonesian dot-thousands without prefix (last resort, >=4 digits)
  //********** e.g. "50.000", "1.500.000"  - must be at least X.XXX format
  /\b(\d{1,3}(?:\.\d{3})+)\b/g,
];

/**
 * Convert a matched numeric string to a plain integer.
 * Handles both Indonesian (dot=thousands, comma=decimal)
 * and Western (comma=thousands, dot=decimal) notation.
 */
function normalizeAmount(raw: string): number {
  //********** Remove any currency prefix remnants
  const s = raw.trim();

  //********** Detect notation by position of last separator
  const lastDot   = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  let normalized: string;

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      //********** Indonesian notation: dots = thousands, comma = decimal
      //********** e.g. "1.500.000,00" -> remove dots, replace comma with dot
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      //********** Western notation: commas = thousands, dot = decimal
      //********** e.g. "1,500,000.00" -> remove commas
      normalized = s.replace(/,/g, "");
    }
  } else {
    //********** No separator or only one type -> treat as integer
    normalized = s.replace(/[,\.]/g, "");
  }

  const value = parseFloat(normalized);
  //********** We only care about whole rupiah amounts; floor sub-rupiah cents
  return isNaN(value) ? 0 : Math.floor(value);
}

/**
 * Extract the largest valid IDR nominal from raw m-banking text.
 *
 * @param text - Raw paste from SMS, push notification, or receipt
 * @returns The largest detected amount as a plain integer, or null if none found
 *
 * @example
 * parseMutationText("BCA - Debit Rp50.000 dari rek 123456789")
 * // → 50000
 *
 * parseMutationText("Transfer Rp1.500.000,00 ke Rek 987654321 berhasil")
 * // → 1500000
 */
export function parseMutationText(text: string): number | null {
  if (!text || typeof text !== "string") return null;

  //********** 1. Sanitize: replace exclusion patterns with spaces to prevent
  //**********    partial-number leakage from masked regions
  let sanitized = text;
  for (const pattern of EXCLUSION_PATTERNS) {
    sanitized = sanitized.replace(pattern, " ");
  }

  //********** 2. Collect all candidate amounts
  const candidates: number[] = [];

  for (const pattern of AMOUNT_PATTERNS) {
    //********** Always reset lastIndex for global regexes
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sanitized)) !== null) {
      const raw = match[1] ?? match[0];
      const value = normalizeAmount(raw);
      //********** Only accept amounts >= 1 (filter out noise / zeros)
      if (value >= 1) {
        candidates.push(value);
      }
    }
  }

  if (candidates.length === 0) return null;

  //********** 3. Return the largest candidate (most likely the transaction amount,
  //**********    not a fee or account suffix)
  return Math.max(...candidates);
}
