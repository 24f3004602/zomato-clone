# OTP/SMS Verification Code Not Sending - Diagnostic Report

## Problem

Verification codes are not being sent to mobile numbers when users request OTP.

---

## Root Cause

**`SMS_PROVIDER` is not configured in `.env.local`**

Current configuration:
- `SMS_PROVIDER=` (empty/missing)
- `SMS_API_KEY=` (empty/missing)

**Default Behavior:**
When `SMS_PROVIDER` is not set, the system defaults to `LogSmsProvider`, which only logs OTP codes to the console instead of sending real SMS.

---

## Solution

### Step 1: Get Fast2SMS API Key

1. Visit https://www.fast2sms.com
2. Login or create account
3. Go to "API Keys" section
4. Copy your API key (looks like: `hvjofF92OxMYV3S8iTkb0l6bfG5U7BRMYsUhXvCbZYii9Efi8tyx70JyKt3l`)
5. Verify you have a registered "Sender ID" (usually "TABLETRAIL" or similar)

### Step 2: Configure Environment Variables

Edit `.env.local`:

```env
SMS_PROVIDER=fast2sms
SMS_API_KEY=your-api-key-here
SMS_SENDER_ID=TABLETRAIL
```

Example:
```env
SMS_PROVIDER=fast2sms
SMS_API_KEY=hvjofF92OxMYV3S8iTkb0l6bfG5U7BRMYsUhXvCbZYii9Efi8tyx70JyKt3l
SMS_SENDER_ID=TABLETRAIL
```

### Step 3: Restart Server

```bash
npm run dev
```

---

## How It Works Now

### Current Flow (Broken)
```
Customer requests OTP
  ↓
POST /api/auth/request-otp {phone: "+919999999999"}
  ↓
requestOtp() in auth.ts
  ↓
getSmsProvider() → LogSmsProvider (no real SMS)
  ↓
Console logs: "[SMS OTP] Phone: 919999999999, Code: 123456"
  ↓
No SMS sent to phone ❌
```

### After Fix
```
Customer requests OTP
  ↓
POST /api/auth/request-otp {phone: "+919999999999"}
  ↓
requestOtp() in auth.ts
  ↓
getSmsProvider() → Fast2SmsProvider
  ↓
API call to https://www.fast2sms.com/dev/bulkV2
  ├─ POST with route: "otp"
  ├─ message: "Your TableTrail OTP is: 123456..."
  ├─ phone: "919999999999" (+ prefix removed)
  └─ sender_id: "TABLETRAIL"
  ↓
Fast2SMS processes and sends SMS ✅
```

---

## OTP Flow Explained

### 1. Request OTP

**Endpoint:** `POST /api/auth/request-otp`

**Request:**
```json
{
  "phone": "+919999999999"
}
```

**Response:**
```json
{
  "data": {
    "phone": "919999999999",
    "expiresAt": "2025-10-28T11:40:00.000Z"
  }
}
```

**What Happens:**
1. Phone number is normalized (removed spaces, dashes)
2. 6-digit code is generated (100000-999999)
3. Code hash is stored in database (`OtpChallenge` table)
4. SMS sent via provider (now Fast2SMS)

### 2. Verify OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Request:**
```json
{
  "phone": "+919999999999",
  "code": "123456"
}
```

**Response:**
```json
{
  "id": "user-123",
  "name": "New customer",
  "phone": "919999999999",
  "role": "CUSTOMER"
}
```

**What Happens:**
1. Phone and code are validated
2. Code is checked against hash in database
3. Expiry time is verified (5 minutes)
4. Session is created (30-day cookie)

---

## Verification Steps

### 1. Check Configuration

```bash
# Verify .env.local has SMS_PROVIDER set
grep SMS_PROVIDER .env.local
# Expected output: SMS_PROVIDER=fast2sms

# Verify API key is set
grep SMS_API_KEY .env.local
# Expected output: SMS_API_KEY=your-key-here
```

### 2. Check Database

```sql
-- Verify OtpChallenge table exists
SELECT * FROM "OtpChallenge" ORDER BY "createdAt" DESC LIMIT 5;

-- Should show recent OTP attempts with:
-- id, phone, codeHash, expiresAt, consumedAt, createdAt
```

### 3. Check Logs

When requesting OTP with correct provider:
```
✓ OTP requested for +919999999999
✓ OTP code sent via Fast2SMS
✓ Request ID: [Fast2SMS request ID]
```

When using LogSmsProvider (current):
```
[SMS OTP] Phone: 919999999999, Code: 123456
```

---

## Common Issues & Troubleshooting

### Issue: "Fast2SMS API error"

**Cause:** Invalid API key

**Fix:**
1. Copy API key from Fast2SMS dashboard again (verify it's complete)
2. Remove any spaces or invisible characters
3. Restart server

### Issue: "SMS_API_KEY environment variable must be set"

**Cause:** SMS_API_KEY is empty

**Fix:**
```env
SMS_API_KEY=your-complete-api-key
```

### Issue: SMS sent but customer doesn't receive it

**Cause 1:** Phone number format wrong
- Ensure phone starts with country code (91 for India)
- Remove +, spaces, dashes (Fast2SMS handles this)
- Example: `+91 9999 999999` → stored as `919999999999`

**Cause 2:** Fast2SMS account issues
- Check Fast2SMS dashboard for failed messages
- Verify sender ID is approved
- Check account balance/credits

**Cause 3:** Recipient's network blocking
- Some carriers may block bulk SMS
- Customer should check spam folder
- Try from different number

---

## SMS Provider Options

### Current (Broken)
```
SMS_PROVIDER=log
→ Logs to console only, no real SMS
```

### Recommended (Production)
```
SMS_PROVIDER=fast2sms
SMS_API_KEY=your-api-key
SMS_SENDER_ID=TABLETRAIL
→ Sends real SMS via Fast2SMS
```

### Other Options (Future)
```
SMS_PROVIDER=twilio
SMS_API_KEY=your-twilio-key
→ Uses Twilio SMS service

SMS_PROVIDER=aws-sns
SMS_API_KEY=your-aws-key
→ Uses AWS SNS for SMS
```

---

## Implementation in Code

**File:** `src/lib/providers.ts`

**Class:** `Fast2SmsProvider`

```typescript
async sendOtp(input: { phone: string; code: string }) {
  const message = `Your TableTrail OTP is: ${input.code}. Valid for 5 minutes.`;
  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    },
    body: JSON.stringify({
      route: "otp",
      message,
      numbers: input.phone.replace(/^\+/, ""),
      sender_id: this.senderId,
    }),
  });
  // Returns { accepted: true, providerReference: request_id }
}
```

---

## Quick Fix (Copy-Paste)

1. **Get API key from Fast2SMS dashboard**

2. **Update `.env.local`:**
```env
SMS_PROVIDER=fast2sms
SMS_API_KEY=your-actual-api-key-here
SMS_SENDER_ID=TABLETRAIL
```

3. **Restart:**
```bash
npm run dev
```

4. **Test:**
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'
```

5. **Check:**
- SMS should arrive on phone within 10 seconds
- If not, check Fast2SMS dashboard for failed messages

---

## Status

- **Current:** ❌ SMS provider not configured
- **Action:** Add SMS_PROVIDER and SMS_API_KEY to .env.local
- **Expected:** ✅ OTP codes will send to mobile numbers

**Estimated Fix Time:** 2 minutes

---

**For support:** Check Fast2SMS dashboard or contact their support team.
