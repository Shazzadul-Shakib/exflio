import { CreditCard, LayoutDashboard, PiggyBank, Receipt, Target, Wallet } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/debts", label: "Debts", icon: CreditCard },
];
