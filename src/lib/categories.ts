import {
  Briefcase,
  Car,
  Clapperboard,
  CreditCard,
  Gift,
  GraduationCap,
  Lightbulb,
  Landmark,
  Laptop,
  Package,
  PiggyBank,
  ShoppingBag,
  Stethoscope,
  Store,
  TrendingUp,
  Utensils,
  ArrowLeftRight,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { WalletType } from "./types";

export interface CategoryDef {
  name: string;
  icon: LucideIcon;
  /** Fixed categorical color slot (1-8), assigned once and never reassigned. */
  slot: number;
}

// Fixed order — colors are assigned by position here, never generated or
// re-ordered by filters/sorts, so a category always reads as the same hue.
export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { name: "Food & Dining", icon: Utensils, slot: 1 },
  { name: "Transport", icon: Car, slot: 2 },
  { name: "Bills & Utilities", icon: Lightbulb, slot: 3 },
  { name: "Shopping", icon: ShoppingBag, slot: 4 },
  { name: "Entertainment", icon: Clapperboard, slot: 5 },
  { name: "Health", icon: Stethoscope, slot: 6 },
  { name: "Education", icon: GraduationCap, slot: 7 },
  { name: "Other", icon: Package, slot: 8 },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { name: "Salary", icon: Briefcase, slot: 1 },
  { name: "Freelance", icon: Laptop, slot: 2 },
  { name: "Business", icon: Store, slot: 3 },
  { name: "Investment", icon: TrendingUp, slot: 4 },
  { name: "Gift", icon: Gift, slot: 5 },
  { name: "Other", icon: Package, slot: 8 },
];

export const TRANSFER_CATEGORY = "Transfer";

export const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES.map((c) => c.name),
  ...INCOME_CATEGORIES.map((c) => c.name),
  TRANSFER_CATEGORY,
].filter((v, i, arr) => arr.indexOf(v) === i);

export function categorySlot(category: string): number {
  const found =
    EXPENSE_CATEGORIES.find((c) => c.name === category) ??
    INCOME_CATEGORIES.find((c) => c.name === category);
  return found?.slot ?? 8;
}

export function categoryIcon(category: string): LucideIcon {
  if (category === TRANSFER_CATEGORY) return ArrowLeftRight;
  const found =
    EXPENSE_CATEGORIES.find((c) => c.name === category) ??
    INCOME_CATEGORIES.find((c) => c.name === category);
  return found?.icon ?? Package;
}

export const WALLET_TYPE_META: Record<
  WalletType,
  { label: string; icon: LucideIcon; slot: number }
> = {
  cash: { label: "Cash", icon: Wallet, slot: 1 },
  bank: { label: "Bank", icon: Landmark, slot: 3 },
  savings: { label: "Savings", icon: PiggyBank, slot: 4 },
  debt: { label: "Debt", icon: CreditCard, slot: 0 }, // 0 = status-critical, not a categorical slot
};
