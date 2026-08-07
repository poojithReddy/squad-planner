import Link from "next/link";
import { notFound } from "next/navigation";

import { BucketPlayerImport } from "@/components/players/bucket-player-import";
import { TeamNav } from "@/components/teams/team-nav";
import { requireTeamAccess } from "@/lib/planning/access";
import { createClient } from "@/lib/supabase/server";

export default async function BucketImportPage({ params }: { params: Promise<{ teamId: string; bucketId: string }> }) {
  const { teamId, bucketId } = await params;
  await requireTeamAccess(teamId, true);
  const supabase = await createClient();
  const { data: bucket } = await supabase.from("auction_buckets").select("id,name").eq("id", bucketId).eq("team_id", teamId).maybeSingle();
  if (!bucket) notFound();
  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"><TeamNav teamId={teamId} /><Link href={`/teams/${teamId}/buckets`} className="text-sm font-bold text-slate-500">Back to buckets</Link><p className="mt-5 text-sm font-bold text-pitch">Importing into</p><h1 className="mt-1 text-3xl font-bold text-ink">{bucket.name}</h1><p className="mt-2 text-slate-500">The selected bucket is enforced on the server and cannot be supplied by the spreadsheet.</p><div className="mt-6"><BucketPlayerImport teamId={teamId} bucket={bucket} /></div></div>;
}
