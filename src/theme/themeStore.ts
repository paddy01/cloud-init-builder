import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface ThemeState {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  storageWarningVisible: boolean;
  storageWarningShown: boolean;
}

export const initialThemeState: ThemeState = {
  preference: "system",
  resolvedTheme: "light",
  storageWarningVisible: false,
  storageWarningShown: false,
};

export const useThemeStore = create<ThemeState>(() => initialThemeState);

export function resetThemeStore(): void {
  useThemeStore.setState(initialThemeState, true);
}
