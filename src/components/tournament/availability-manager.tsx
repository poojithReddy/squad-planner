"use client";

import { useState, useTransition } from "react";
import {
  createAvailabilityLink,
  disableAvailabilityLink,
} from "@/app/(protected)/teams/[teamId]/tournament/availability/actions";

export function AvailabilityManager({
  teamId,
  tournamentId,
  hasActiveLink,
}: {
  teamId: string;
  tournamentId: string;
  hasActiveLink: boolean;
}) {
  const [url, setUrl] = useState("");
  const [active, setActive] = useState(hasActiveLink);
  const [expiry, setExpiry] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  function generate() {
    if (active && !window.confirm("Regenerate the link and invalidate the previous one?")) return;
    start(async () => {
      const result = await createAvailabilityLink(
        teamId,
        tournamentId,
        expiry ? new Date(expiry).toISOString() : null,
      );
      if (result.ok && result.url) {
        setUrl(result.url);
        setActive(true);
        setMessage("New availability link created. Copy it now; for security it is shown only in this session.");
      } else {
        setMessage(result.message ?? "Unable to create link.");
      }
    });
  }

  async function copy(text: string, success: string) {
    await navigator.clipboard.writeText(text);
    setMessage(success);
  }

  function disable() {
    start(async () => {
      const result = await disableAvailabilityLink(teamId, tournamentId);
      if (result.ok) {
        setActive(false);
        setUrl("");
      }
      setMessage(result.message);
    });
  }

  const shareText = `Hi team, please update your availability for the upcoming tournament using this link: ${url}`;
  const reminderText = `Reminder: please update your availability for this week's matches: ${url}`;
  const whatsapp = url ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : "";

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Tournament availability", text: shareText, url });
    } else {
      await copy(url, "Availability link copied.");
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="team-accent-text text-xs font-bold uppercase">Share availability</p>
          <h2 className="text-xl font-black">Public player response link</h2>
          <p className="mt-1 text-sm text-slate-500">Players can respond without creating an account.</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
          {active ? "Active" : "No active link"}
        </span>
      </div>

      <label className="mt-4 block text-sm font-bold">
        Responses close on (optional)
        <input type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 sm:max-w-xs" />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={pending} onClick={generate} className="team-primary min-h-11 rounded-xl px-4 text-sm font-bold">
          {pending ? "Working..." : active ? "Regenerate Link" : "Create Link"}
        </button>
        {active ? <button disabled={pending} onClick={disable} className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700">Disable Link</button> : null}
      </div>

      {url ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="break-all text-sm font-semibold">{url}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button onClick={() => copy(url, "Availability link copied.")} className="min-h-11 rounded-xl border bg-white px-3 text-sm font-bold">Copy Link</button>
            <button onClick={share} className="min-h-11 rounded-xl border bg-white px-3 text-sm font-bold">Share</button>
            <button onClick={() => copy(reminderText, "Reminder message copied.")} className="min-h-11 rounded-xl border bg-white px-3 text-sm font-bold">Copy Reminder</button>
            <a href={whatsapp} target="_blank" rel="noreferrer" className="min-h-11 rounded-xl bg-emerald-700 px-3 py-3 text-center text-sm font-bold text-white">Share on WhatsApp</a>
          </div>
        </div>
      ) : active ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">An active secure link exists. Regenerate it if you need a new copyable URL.</p>
      ) : null}
      {message ? <p role="status" className="mt-3 text-sm font-semibold">{message}</p> : null}
    </section>
  );
}
