import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    numberingSystem: 'latn'
  }).format(Number(amount));
}

export function formatNumber(val: number | string) {
  return new Intl.NumberFormat("en-US").format(Number(val));
}
