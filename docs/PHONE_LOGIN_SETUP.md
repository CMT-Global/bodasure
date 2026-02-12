# Phone login (SMS OTP) setup

This app supports signing in with a mobile number and a one-time code sent via SMS Leopard.

## 1. Run the migration

Apply the `phone_otps` table migration:

```bash
supabase db push
# or
supabase migration up
```

## 2. Edge Function secrets (required for "Send OTP")

If you see **"SMS service not configured"** or 500 from `request-otp`, the SMS Leopard keys are not set. Add them:

**Option A – Supabase Dashboard (recommended)**  
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project (**khumlkokauqpmbhmsiov**).  
2. Go to **Project Settings** (gear icon) → **Edge Functions**.  
3. Under **Secrets**, add:
   - Name: `SMSLEOPARD_API_KEY` → Value: your [SMS Leopard](https://www.smsleopard.com/) API key  
   - Name: `SMSLEOPARD_API_SECRET_KEY` → Value: your SMS Leopard API secret  
4. Save. No need to redeploy the function; new invocations will use the new secrets.

**Option B – CLI**  
```bash
npx supabase secrets set SMSLEOPARD_API_KEY=your_api_key_here --project-ref khumlkokauqpmbhmsiov
npx supabase secrets set SMSLEOPARD_API_SECRET_KEY=your_api_secret_here --project-ref khumlkokauqpmbhmsiov
```

| Secret | Required | Description |
|--------|----------|-------------|
| `SMSLEOPARD_API_KEY` | **Yes** | SMS Leopard API key |
| `SMSLEOPARD_API_SECRET_KEY` | **Yes** | SMS Leopard API secret |
| `SMSLEOPARD_SENDER_ID` | **Yes** | Sender ID **assigned to your SMS Leopard account**. Use the **exact** same value that works in the SMS Leopard chatbot (copy-paste from there or from your [SMS Leopard Sender IDs](https://www.smsleopard.com/senderId))—same spelling and casing. If you see "Unrecognized sender id", the value in this secret does not match what is assigned to your account. |
| `OTP_SALT` | No | Random string to salt OTP hashes; defaults to a built-in value |
| `APP_URL` | No | App origin for magic link redirect, e.g. `https://yourapp.com` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

## 3. Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration, add your app URLs to **Redirect URLs**, for example:

- `http://localhost:5173`
- `http://localhost:5173/**`
- `https://your-production-domain.com`
- `https://your-production-domain.com/**`

Otherwise the magic link after OTP verification will not redirect back to your app.

## 4. Deploy Edge Functions

**Required:** The app calls these functions at `https://<your-project>.supabase.co/functions/v1/request-otp` and `.../verify-otp`. If you see **"Failed to send a request to the Edge Function"** or **"Unable to reach the server"** when sending OTP, the functions are not deployed or not reachable.

Deploy both functions:

```bash
supabase link   # if not already linked to your project
supabase functions deploy request-otp
supabase functions deploy verify-otp
```

Set secrets before or after deploy (Dashboard → Project Settings → Edge Functions, or `supabase secrets set SMSLEOPARD_API_KEY your_key`).

## Flow

1. User enters phone number and clicks **Send OTP**.
2. Backend generates a 6-digit OTP, stores a hash in `phone_otps`, and sends the code via SMS Leopard.
3. User enters the OTP and clicks **Verify & sign in**.
4. Backend verifies the OTP (max 3 attempts), then deletes the OTP row, finds or creates the user (by phone), and returns a Supabase magic link.
5. The client redirects to that link; Supabase sets the session and redirects to your app.

**Rules**

- OTP expires after **5 minutes**; expired rows are removed from the DB when a new OTP is requested.
- **3 verification attempts** per OTP; after 3 wrong codes the OTP is deleted and that phone is **locked out for 10 minutes** — they cannot request a new OTP until the lockout expires (message: "You can try again after 10 minutes").
- **Resend cooldown: 1 minute** — the same phone cannot request a new OTP within 60 seconds.
- On successful verification the OTP is **deleted** so it cannot be reused.

Phone numbers are normalized to E.164 (e.g. `+254712345678`). New users get an account with a synthetic email `phone+{digits}@bodasure.local` and their phone stored on their profile.

**Signup:** Signup works the same with email or phone. The app uses Supabase `signUp()` only (no Edge Functions). If the user leaves email empty, the account uses a synthetic email and profile.phone is set. Edge Functions (request-otp, verify-otp) are only required for **login** with phone + OTP on the login page.

---

## Troubleshooting 502 "Failed to send SMS"

If you get **502 Bad Gateway** and the response says "Failed to send SMS" (or a more specific message after the latest deploy):

1. **Check Edge Function logs**  
   Supabase Dashboard → **Edge Functions** → select **request-otp** → **Logs**. The log line `SMS Leopard error: <status> <body>` shows the exact response from SMS Leopard.

2. **Common causes**
   - **401** – Wrong API key or secret. Re-check `SMSLEOPARD_API_KEY` and `SMSLEOPARD_API_SECRET_KEY` in Project Settings → Edge Functions → Secrets. Use the values from your [SMS Leopard](https://www.smsleopard.com/) dashboard (API / Developer section).
   - **402** – Insufficient balance on your SMS Leopard account. Top up the account.
   - **"Unrecognized sender id" / 404** – The sender ID (e.g. `SMS_Leopard`) is not assigned to your SMS Leopard account. In **Edge Function secrets**, set **`SMSLEOPARD_SENDER_ID`** to a sender ID that appears in your [SMS Leopard Sender IDs](https://www.smsleopard.com/senderId) page (e.g. your brand or approved shortcode). Then redeploy `request-otp` (or wait for the next invoke).
   - **400 / 4xx** – Other invalid request (e.g. number format). The function sends the number without a leading `+`.

3. **Redeploy after changing secrets**  
   Secrets are read at runtime; you don’t need to redeploy. If you still get 401, double-check there are no extra spaces and that you’re using **API Key** and **API Secret** (not password).
