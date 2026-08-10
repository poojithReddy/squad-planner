import Link from "next/link";
import { requireSuperAdmin } from "@/lib/platform/admin-access";
import {getPermissionMap}from"@/lib/permissions/server";import{permissionGranted}from"@/lib/permissions/registry";

export default async function AdminLayout({children}:{children:React.ReactNode}){
  await requireSuperAdmin();const permissions=await getPermissionMap("platform",null);const links=[permissionGranted(permissions,"admin_dashboard","view")&&["Dashboard","/admin"],permissionGranted(permissions,"tournaments","view")&&["Tournaments","/admin/tournaments"],permissionGranted(permissions,"platform_users","view")&&["Users & Admin Access","/admin/users"],permissionGranted(permissions,"platform_users","manage")&&["Roles & Permissions","/admin/roles"],["Profile","/profile"]].filter(Boolean)as string[][];
  return <div><div className="border-b bg-white"><nav aria-label="Super Admin" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">{links.map(([label,href])=><Link key={href} href={href} className="min-h-10 shrink-0 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-100">{label}</Link>)}</nav></div>{children}</div>;
}
