import Link from "next/link";
import { requireSuperAdmin } from "@/lib/platform/admin-access";

export default async function AdminLayout({children}:{children:React.ReactNode}){
  await requireSuperAdmin();
  return <div><div className="border-b bg-white"><nav aria-label="Super Admin" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8"><Link href="/admin" className="min-h-10 shrink-0 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-100">Dashboard</Link><Link href="/admin/tournaments" className="min-h-10 shrink-0 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-100">Tournaments</Link><Link href="/admin/users" className="min-h-10 shrink-0 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-100">Users & Admin Access</Link><Link href="/profile" className="min-h-10 shrink-0 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-100">Profile</Link></nav></div>{children}</div>;
}
