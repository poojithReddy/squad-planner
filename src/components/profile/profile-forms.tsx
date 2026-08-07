"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";

import { changePassword, updateProfile, uploadAvatar } from "@/app/(protected)/profile/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialFormState } from "@/types/forms";

type Profile = { full_name: string | null; preferred_name: string | null; display_name: string | null; phone: string | null; bio: string | null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  const fields = [["fullName", "Full name", profile.full_name, 150], ["preferredName", "Preferred name", profile.preferred_name, 100], ["displayName", "Display name", profile.display_name, 100], ["phone", "Phone", profile.phone, 30]] as const;
  return <form action={action} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{fields.map(([name, label, value, max]) => <label key={name} className="text-sm font-bold">{label}<input name={name} maxLength={max} defaultValue={value ?? ""} className="mt-1 min-h-12 w-full rounded-xl border px-3" /></label>)}<label className="text-sm font-bold sm:col-span-2">Bio<textarea name="bio" maxLength={500} defaultValue={profile.bio ?? ""} className="mt-1 w-full rounded-xl border p-3" /></label></div><FormMessage state={state} /><SubmitButton pendingLabel="Saving...">Save Changes</SubmitButton></form>;
}

export function AvatarForm() {
  const [state, action] = useActionState(uploadAvatar, initialFormState);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <form action={action}><label className="text-sm font-bold">Profile photo<input name="file" required type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPreview(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : null)} className="mt-1 w-full rounded-xl border p-3" /></label>{preview ? <Image unoptimized src={preview} width={128} height={128} alt="Profile photo preview" className="mt-3 size-32 rounded-full object-cover" /> : null}<div className="mt-3"><SubmitButton pendingLabel="Uploading...">Upload Photo</SubmitButton></div><FormMessage state={state} /></form>;
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialFormState);
  return <form action={action} className="space-y-3"><label className="block text-sm font-bold">New password<input name="password" type="password" minLength={8} required autoComplete="new-password" className="mt-1 min-h-12 w-full rounded-xl border px-3" /></label><label className="block text-sm font-bold">Confirm new password<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" className="mt-1 min-h-12 w-full rounded-xl border px-3" /></label><FormMessage state={state} /><SubmitButton pendingLabel="Changing...">Change Password</SubmitButton></form>;
}
