import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char)
}

export function plainTextToHtml(value: string) {
  const normalizedValue = value
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")

  return escapeHtml(normalizedValue).replace(/\n/g, "<br />")
}
