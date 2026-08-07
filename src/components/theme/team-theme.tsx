"use client";

import { useEffect } from "react";
import { createTeamTheme } from "@/lib/theme/team-colour";

const keys=["--team-primary","--team-primary-hover","--team-primary-pressed","--team-primary-foreground","--team-primary-soft","--team-primary-border","--team-focus","--pitch","--pitch-dark"] as const;

export function TeamTheme({primaryColour}:{primaryColour:string|null}){
  useEffect(()=>{
    const root=document.documentElement,theme=createTeamTheme(primaryColour);
    const previous=new Map(keys.map(key=>[key,root.style.getPropertyValue(key)]));
    root.style.setProperty("--team-primary",theme.primary);
    root.style.setProperty("--team-primary-hover",theme.hover);
    root.style.setProperty("--team-primary-pressed",theme.pressed);
    root.style.setProperty("--team-primary-foreground",theme.foreground);
    root.style.setProperty("--team-primary-soft",theme.soft);
    root.style.setProperty("--team-primary-border",theme.border);
    root.style.setProperty("--team-focus",theme.focus);
    root.style.setProperty("--pitch",theme.primary);
    root.style.setProperty("--pitch-dark",theme.hover);
    root.dataset.teamWorkspace="true";
    return()=>{for(const key of keys){const value=previous.get(key);if(value)root.style.setProperty(key,value);else root.style.removeProperty(key)}delete root.dataset.teamWorkspace};
  },[primaryColour]);
  return null;
}
