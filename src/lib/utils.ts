import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRandomString(length: number) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function snakeToCamel(str: string) {
  return (
    str.charAt(0).toUpperCase() +
    str
      .slice(1)
      .toLowerCase()
      .replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase().replace("-", "").replace("_", "")
      )
  );
}

export function camelToSnake(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}