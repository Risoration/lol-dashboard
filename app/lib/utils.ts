import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertAxiosHeadersToHeaders(
  headers: Record<string, any>
): Headers {
  const headersObject = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      headersObject.append(key, value.join(', '));
    } else if (value !== null && value !== undefined) {
      headersObject.append(key, String(value));
    }
  }
  return headersObject;
}
