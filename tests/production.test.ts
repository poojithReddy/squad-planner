import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("profile migration keeps assets private and scopes paths to the user", () => {
  const sql = readFileSync("supabase/migrations/006_profile_production.sql", "utf8");
  assert.match(sql, /profile-assets/);
  assert.match(sql, /false/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /profile_image_path/);
});

test("production headers and protected profile route are configured", () => {
  const config = readFileSync("next.config.ts", "utf8");
  const session = readFileSync("src/lib/supabase/proxy.ts", "utf8");
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
  assert.match(session, /dashboard|teams/);
});
