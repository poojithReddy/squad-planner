import Link from "next/link";

import { TeamForm } from "@/components/teams/team-form";
import { requireUser } from "@/lib/auth/session";

export default async function NewTeamPage() {
  await requireUser();
  return <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8"><Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-pitch">← Dashboard</Link><div className="mt-5"><p className="text-sm font-bold text-pitch">Database verification</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Create a test team</h1><p className="mt-2 text-sm leading-6 text-slate-500">Use this minimal form after the migration is applied to verify atomic team and owner-membership creation.</p></div><div className="mt-8"><TeamForm /></div></div>;
}
