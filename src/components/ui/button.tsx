import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-pitch text-white shadow-sm hover:bg-pitch-dark",
  secondary: "border border-slate-300 bg-white text-ink hover:border-pitch hover:text-pitch",
  destructive: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-ink",
};
export const buttonClass = (variant: Variant = "primary", className = "") => `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`;
export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) { return <button className={buttonClass(variant, className)} {...props}/>; }
export function ButtonLinkStyle({ variant = "primary", className = "", ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) { return <a className={buttonClass(variant, className)} {...props}/>; }
