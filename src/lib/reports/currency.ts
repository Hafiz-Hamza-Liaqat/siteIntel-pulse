export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function getCurrencySymbol(currency: string = "USD"): string {
  switch (currency.toUpperCase()) {
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "CAD":
      return "CA$";
    case "AUD":
      return "A$";
    case "JPY":
      return "¥";
    case "CHF":
      return "CHF ";
    case "USD":
    default:
      return "$";
  }
}

export interface FormatCurrencyOptions {
  decimals?: number;
  preserveDecimals?: boolean;
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  options?: FormatCurrencyOptions
): string {
  const symbol = getCurrencySymbol(currency);
  const normalizedCurrency = currency.toUpperCase();

  if (!Number.isFinite(amount)) {
    return `${symbol}0`;
  }

  let formattedNumber: string;

  if (options?.decimals !== undefined) {
    formattedNumber = amount.toLocaleString("en-US", {
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals,
    });
  } else if (normalizedCurrency === "JPY") {
    formattedNumber = Math.round(amount).toLocaleString("en-US");
  } else if (amount % 1 !== 0) {
    formattedNumber = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    formattedNumber = Math.round(amount).toLocaleString("en-US");
  }

  return `${symbol}${formattedNumber}`;
}
