// Simple obfuscation for localStorage to prevent casual inspection
const encode = (str: string): string => {
  try {
    return btoa(encodeURIComponent(str));
  } catch {
    return str;
  }
};

const decode = (str: string): string => {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return str;
  }
};

export const obfuscatedStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    return decode(raw);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(name, encode(value));
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(name);
  },
};
