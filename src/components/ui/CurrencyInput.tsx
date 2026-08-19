/********** Imports **********/
"use client";

import { useCallback, forwardRef } from "react";

/********** Types **********/
export interface CurrencyInputProps {
  id?: string;
  value: number | string;
  onChange: (rawValue: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/********** Helpers **********/
/**
 * Strips all non-digit characters from the input string.
 *
 * @param str - The string to be processed.
 * @returns A string containing only digits.
 */
function toRaw(str: string): string {
  return str.replace(/\D/g, "");
}

/**
 * Formats a raw digit string with dots as thousands separators (Indonesian format).
 *
 * @param raw - The raw string of digits.
 * @returns The formatted currency string.
 */
function formatIDR(raw: string): string {
  if (!raw) return "";
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/********** Component **********/
/**
 * Input field for currency values that automatically formats with thousands separators.
 *
 * Emits raw numeric strings (e.g., "1500000") to the `onChange` handler while
 * displaying formatted currency (e.g., "1.500.000") to the user.
 *
 * @param props - Props for the currency input component.
 * @param ref - Ref forwarded to the underlying input element.
 * @returns A controlled input element.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    { id, value, onChange, placeholder = "0", required, autoFocus, className = "" },
    ref
  ) {
    const displayValue = formatIDR(toRaw(String(value)));

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = toRaw(e.target.value);
        /********** Prevent leading zeros (except empty). */
        const cleaned = raw.replace(/^0+(\d)/, "$1");
        onChange(cleaned);
      },
      [onChange]
    );

    return (
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        className={[
          "appearance-none",
          "[&::-webkit-inner-spin-button]:appearance-none",
          "[&::-webkit-outer-spin-button]:appearance-none",
          className,
        ].join(" ")}
      />
    );
  }
);

/********** Exports **********/

