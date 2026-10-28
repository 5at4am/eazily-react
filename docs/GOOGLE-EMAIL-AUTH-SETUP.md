# Google and email OTP sign-in

The app offers **Continue with Google** and **Send email code**. Gmail and other valid email addresses are accepted. There is no mobile-number sign-in or mobile verification step in partner onboarding. Ordinary booking contact numbers remain contact information.

## Verified on 23 October 2026

Project `rujrweqttrqdmkkbamjt` reports Google and email enabled, phone disabled, signup enabled, and email confirmation required. Real eight-digit OTP verification, authenticated sessions, refresh and logout passed using disposable synthetic accounts. No email or SMS was delivered by those tests.

Migration `20261023000100_email_identity_verification` is applied and recorded in hosted migration history. It replaces mobile verification in every service-partner submission path. Verification uses `auth.users.email_confirmed_at`; editable metadata and profile flags cannot prove identity. Profile email and verification status synchronize from Auth. The post-migration audit found no mobile verification functions and no profile-email mismatches.

## Check email delivery before inviting users

1. In Supabase Authentication, open the Email provider and keep email confirmation enabled. Match the hosted OTP length to `VITE_AUTH_EMAIL_OTP_LENGTH=8`.
2. In the email templates, include `{{ .Token }}` in **Magic Link** and **Confirm signup**. The app expects a numeric code that users enter in the app. Use the prepared HTML in `supabase/templates/email-otp.html` as the body.
3. Configure custom SMTP for public users. Supabase's default sender restricts delivery to project team addresses and has a small sending allowance. Keep provider credentials in the Supabase dashboard, outside frontend environment files. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
4. Send a code to an inbox you control. Test first signup, returning sign-in, wrong/expired codes, resend, and spam-folder delivery. SMTP delivery and the currently saved hosted template were not inspected by this run.

OTP emails share the passwordless implementation with magic links; the template token determines the delivered code. See [Supabase email OTP documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Google and return links

Google is enabled in the current project. Keep the OAuth client secret in Supabase. Its authorized Google redirect URI is:

```text
https://rujrweqttrqdmkkbamjt.supabase.co/auth/v1/callback
```

Keep this exact Android return URL in Supabase's redirect allow list:

```text
com.eazily.app://auth/callback
```

For the web app, allow the deployed origin's customer/partner return paths and the local URLs you actually use. An OAuth client still in Google's testing mode needs the intended accounts on its test-user list. See [Supabase Google sign-in documentation](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

The APK opens the system browser and exchanges the returned PKCE code. Tests cover callback validation, duplicate callback delivery, cancellation, and logout isolation. Interactive Google consent and a physical Android login remain device checks.

## Run checks

```powershell
npm.cmd run auth:status
npm.cmd run test:auth
npm.cmd run test:auth-options
npm.cmd run test:service-registration
npm.cmd run test:navigation
npm.cmd run test:connection-recovery
npm.cmd run test:source
npm.cmd run test:functionality
```

For the explicit disposable-account integration suite on the guarded development project:

```powershell
node scripts/hosted-functionality-test.cjs --run-development
```

Do not replay base SQL or the already-applied migration against the existing database.
