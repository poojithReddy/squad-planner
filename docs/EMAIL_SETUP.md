# Production email setup

Squad Planner continues to use Supabase Auth for signup confirmation and password recovery. SMTP credentials belong only in Supabase, never in this repository or Vercel.

1. Create an account with an SMTP provider such as Resend, SendGrid, or another provider supported by Supabase.
2. Verify the sending domain and create SMTP credentials.
3. In Supabase Dashboard, open Authentication and the SMTP settings.
4. Enable custom SMTP and enter the provider host, port, username, password, sender email, and sender name (`Squad Planner`).
5. Under Authentication email templates, brand Confirm signup and Reset password while retaining Supabase's action-link variable.
6. Test a new signup and a password-reset request using an address you can access.

Suggested subjects are `Confirm your Squad Planner account` and `Reset your Squad Planner password`. Never commit SMTP credentials.
