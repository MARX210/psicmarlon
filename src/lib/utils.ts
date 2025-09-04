
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Adicionando a dependência jwt-decode, pois ela é necessária no Header.
// É uma dependência leve e segura para decodificar tokens no lado do cliente.
import { jwtDecode } from "jwt-decode";
import { getCookie } from 'cookies-next';

export { jwtDecode, getCookie };
