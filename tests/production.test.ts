import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveApplicationOrigin } from "../src/lib/auth/origin.ts";

test("profile migration keeps assets private and scopes paths to the user", () => {
  const sql = readFileSync("supabase/migrations/006_profile_production.sql", "utf8");
  assert.match(sql, /profile-assets/);
  assert.match(sql, /false/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /profile_image_path/);
});

test("production origin uses configured site, then Vercel, then localhost", () => {
  assert.equal(resolveApplicationOrigin({ siteUrl: "https://squadplanner.example.com/", publicVercelUrl: "preview.vercel.app" }), "https://squadplanner.example.com");
  assert.equal(resolveApplicationOrigin({ publicVercelUrl: "preview.vercel.app" }), "https://preview.vercel.app");
  assert.equal(resolveApplicationOrigin({}), "http://localhost:3000");
});

test("auth flows use the centralized application origin", () => {
  const actions = readFileSync("src/app/(auth)/actions.ts", "utf8");
  const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");
  assert.match(actions, /applicationOrigin/);
  assert.match(callback, /applicationOrigin/);
  assert.doesNotMatch(actions, /localhost:3000/);
});

test("production headers and protected profile route are configured", () => {
  const config = readFileSync("next.config.ts", "utf8");
  const session = readFileSync("src/lib/supabase/proxy.ts", "utf8");
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
  assert.match(session, /dashboard|teams/);
});
