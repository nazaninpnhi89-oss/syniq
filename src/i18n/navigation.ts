import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Wrappers هوشمند locale-aware برای ناوبری (Link/redirect/...)
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
