/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamAssetForm } from "@/components/teams/team-asset-form";
import { TeamNav } from "@/components/teams/team-nav";
import { buttonClass } from "@/components/ui/button";
import { getTeamDashboardData } from "@/lib/dashboard/queries";
import { requireTeamAccess } from "@/lib/planning/access";

const money=new Intl.NumberFormat("en-GB",{maximumFractionDigits:2});
const dateFormat=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"});
function formatDate(value:string){return dateFormat.format(new Date(`${value}T12:00:00`))}
function formatTime(value:string|null){if(!value)return "Time TBC";const[h,m]=value.split(":").map(Number);return new Intl.DateTimeFormat("en-GB",{hour:"numeric",minute:"2-digit"}).format(new Date(2020,0,1,h,m))}

export default async function TeamPage({params}:{params:Promise<{teamId:string}>}){
  const {teamId}=await params;
  const [data,access]=await Promise.all([getTeamDashboardData(teamId),requireTeamAccess(teamId)]);
  if(!data)notFound();
  const {team,metrics,tournament}=data;
  const canBrand=access.role==="owner"||access.role==="captain";
  const quickActions=metrics.lifecycle==="planning"?[["Manage Players","players"],["Manage Buckets","buckets"],["Open Planning","planning"],["Start Auction","auction"]]:metrics.lifecycle==="live"?[["Open Auction","auction"],["View Live Squad","squad"],["Open Planning","planning"]]:[["View Squad","squad"],["Add Fixture","tournament/fixtures"],["View Opportunities","opportunities"]];
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-pitch">← All teams</Link>
    <div className="mt-4"><TeamNav teamId={teamId}/></div>

    <section className="relative mt-4 min-h-64 overflow-hidden rounded-3xl border bg-ink shadow-sm sm:min-h-72">
      {team.bannerSignedUrl?<img src={team.bannerSignedUrl} alt={`${team.name} team banner`} className="absolute inset-0 h-full w-full object-cover"/>:<div className="absolute inset-0" style={{background:`linear-gradient(120deg, ${team.primary_colour??"#16734b"}, ${team.secondary_colour??"#11211a"})`}}/>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10"/>
      <div className="relative flex min-h-64 flex-col justify-end p-5 text-white sm:min-h-72 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white/90 text-2xl font-black text-white shadow-lg sm:size-28" style={{backgroundColor:team.primary_colour??"#16734b"}}>{team.logoSignedUrl?<img src={team.logoSignedUrl} alt={`${team.name} team logo`} className="h-full w-full object-cover"/>:initials(team.name)}</div>
          <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.16em] text-lime">Team control centre</p><h1 className="mt-1 truncate text-3xl font-black tracking-[-.04em] sm:text-5xl">{team.name}</h1><p className="mt-2 text-sm text-white/85 sm:text-base">Captain: <strong>{team.captain_name}</strong><span className="mx-2 text-white/40">·</span>Vice Captain: <strong>{team.vice_captain_name||"Not set"}</strong></p></div>
        </div>
      </div>
    </section>

    <section aria-labelledby="quick-actions" className="mt-5"><h2 id="quick-actions" className="sr-only">Quick actions</h2><div className="grid gap-2 sm:flex sm:flex-wrap">{quickActions.map(([label,path],index)=><Link key={path} href={`/teams/${teamId}/${path}`} className={buttonClass(index===0?"primary":"secondary","w-full sm:w-auto")}>{label}</Link>)}</div></section>

    <section aria-labelledby="dashboard-summary" className="mt-7"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-pitch">At a glance</p><h2 id="dashboard-summary" className="mt-1 text-2xl font-black tracking-tight">Team dashboard</h2></div>{tournament?<p className="hidden text-sm font-semibold text-slate-500 sm:block">{tournament.name}</p>:null}</div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard eyebrow="Squad" title={`${metrics.squadCount} / ${metrics.squadTarget}`} description={metrics.squadComplete?"Squad Complete":`${metrics.slotsRemaining} ${metrics.slotsRemaining===1?"slot":"slots"} remaining`} href={`/teams/${teamId}/squad`} cta="View Squad" prominent={metrics.lifecycle==="live"}/>
        <DashboardCard eyebrow="Auction" title={`Auction ${capitalise(metrics.lifecycle)}`} description={metrics.totalBudget>0?`Spent ${money.format(metrics.totalSpent)} / ${money.format(metrics.totalBudget)}`:"No auction budget configured"} href={`/teams/${teamId}/auction`} cta={metrics.lifecycle==="planning"?"Open Auction":"View Auction"} prominent={metrics.lifecycle==="planning"}/>
        <article className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[.14em] text-pitch">Tournament Record</p><h3 className="mt-3 text-3xl font-black">Played {metrics.matchesPlayed}</h3><dl className="mt-4 grid grid-cols-3 gap-2 text-sm"><MiniStat label="Won" value={metrics.wins}/><MiniStat label="Lost" value={metrics.losses}/><MiniStat label="Draw/NR" value={metrics.draws+metrics.noResults}/></dl><Link href={`/teams/${teamId}/tournament`} className="mt-5 inline-flex font-bold text-pitch">View Tournament →</Link></article>
        <article className={`rounded-2xl border p-5 shadow-sm ${metrics.nextFixture?"team-primary team-border":"bg-white"}`}><p className={`text-xs font-black uppercase tracking-[.14em] ${metrics.nextFixture?"opacity-80":"text-pitch"}`}>Next Match</p>{metrics.nextFixture?<><h3 className="mt-3 text-xl font-black">{team.name} vs {metrics.nextFixture.opponent_name}</h3><p className="mt-3 text-sm opacity-85">{formatDate(metrics.nextFixture.match_date)} · {formatTime(metrics.nextFixture.match_time)}</p><p className="mt-1 text-sm opacity-75">{metrics.nextFixture.venue||"Venue TBC"}</p><Link href={`/teams/${teamId}/tournament/matches/${metrics.nextFixture.id}`} className="mt-5 inline-flex font-bold text-current">View Match →</Link></>:<><h3 className="mt-3 text-xl font-black">No upcoming fixture</h3><p className="mt-2 text-sm text-slate-500">Add a fixture when your tournament schedule is ready.</p>{access.canEdit?<Link href={`/teams/${teamId}/tournament/fixtures`} className="mt-5 inline-flex font-bold text-pitch">Add Fixture →</Link>:null}</>}</article>
      </div>
    </section>

    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DashboardCard eyebrow="Players Used" title={`${metrics.playersUsed} / ${metrics.squadCount}`} description={`${metrics.playersYetToPlay} ${metrics.playersYetToPlay===1?"player has":"players have"} yet to play`} href={`/teams/${teamId}/opportunities`} cta="View Opportunities" names={metrics.playersYetToPlayNames}/>
      <DashboardCard eyebrow="Volunteer Duties" title={`${metrics.upcomingDuties} upcoming`} description={`${metrics.openDutyPositions} open ${metrics.openDutyPositions===1?"position":"positions"}`} href={`/teams/${teamId}/duties`} cta="View Duties"/>
      <DashboardCard eyebrow="Budget" title={metrics.remainingBudget===null?"Not configured":money.format(metrics.remainingBudget)} description={metrics.remainingBudget===null?"Set a budget to enable spend tracking":`${money.format(metrics.totalSpent)} spent of ${money.format(metrics.totalBudget)}`} href={`/teams/${teamId}/auction`} cta="View Auction Budget"/>
    </section>

    {canBrand?<details className="mt-8 rounded-2xl border bg-white shadow-sm"><summary className="cursor-pointer list-none p-5 font-black text-ink">Team branding <span className="ml-2 text-sm font-medium text-slate-500">Logo and banner</span></summary><div className="grid gap-4 border-t p-5 lg:grid-cols-2"><TeamAssetForm teamId={teamId} kind="logo" currentUrl={team.logoSignedUrl}/><TeamAssetForm teamId={teamId} kind="banner" currentUrl={team.bannerSignedUrl}/></div></details>:null}
  </div>;
}

function DashboardCard({eyebrow,title,description,href,cta,prominent=false,names=[]}:{eyebrow:string;title:string;description:string;href:string;cta:string;prominent?:boolean;names?:string[]}){return <article className={`rounded-2xl border p-5 shadow-sm ${prominent?"team-soft":"bg-white"}`}><p className="text-xs font-black uppercase tracking-[.14em] text-pitch">{eyebrow}</p><h3 className="mt-3 text-3xl font-black tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>{names.length?<p className="mt-3 text-xs font-semibold text-slate-500">{names.join(" · ")}</p>:null}<Link href={href} className="mt-5 inline-flex font-bold text-pitch">{cta} →</Link></article>}
function MiniStat({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-lg font-black">{value}</dd></div>}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join("").toUpperCase()||"SP"}
function capitalise(value:string){return value.charAt(0).toUpperCase()+value.slice(1)}
