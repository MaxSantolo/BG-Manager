"use client";

import { usePathname } from "next/navigation";
import Navigation from "./Navigation";

export default function NavigationGuard() {
  const pathname = usePathname();
  // L'area sondaggi è una zona a sé per gli ospiti: niente nav dell'app, che
  // porterebbe a pagine protette da APP_PASSWORD.
  if (pathname === "/login" || pathname.startsWith("/survey")) return null;
  return <Navigation />;
}
