# Quick Fix: Enable OTP/SMS Verification

## The Problem
✗ OTP codes are NOT being sent to phone numbers
✗ SMS provider is not configured

## The Solution (2 minutes)

### 1. Get Your Fast2SMS API Key

Go to: https://www.fast2sms.com
- Login to your account
- Click "API Keys" in menu
- Copy your API key

### 2. Update `.env.local`

Add these lines to `.env.local`:

```env
SMS_PROVIDER=fast2sms
SMS_API_KEY=paste-your-api-key-here
SMS_SENDER_ID=TABLETRAIL
```

**Example:**
```env
SMS_PROVIDER=fast2sms
SMS_API_KEY=hvjofF92OxMYV3S8iTkb0l6bfG5U7BRMYsUhXvCbZYii9Efi8tyx70JyKt3l
SMS_SENDER_ID=TABLETRAIL
```

### 3. Restart Server

```bash
npm run dev
```

### 4. Test It

Request OTP:
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'
```

**Expected:** SMS arrives on phone within 10 seconds ✓

---

## That's It!

OTP codes will now send to mobile numbers.

---

## What Was Wrong?

```
❌ Before (.env.local):
   SMS_PROVIDER=          (missing/empty)
   SMS_API_KEY=          (missing/empty)
   → System logs OTP to console instead of sending SMS

✓ After (.env.local):
   SMS_PROVIDER=fast2sms
   SMS_API_KEY=your-api-key
   SMS_SENDER_ID=TABLETRAIL
   → System sends real SMS to phone
```

---

## How It Works

1. Customer requests OTP → enters phone number
2. Server generates 6-digit code (e.g., 123456)
3. Server calls Fast2SMS API with code + phone
4. Fast2SMS sends SMS to phone
5. Customer receives: "Your TableTrail OTP is: 123456"
6. Customer enters code to verify
7. Session created, logged in ✓

---

## Need Help?

- **SMS not arriving?** Check Fast2SMS dashboard for failed messages
- **Wrong API key?** Re-copy from Fast2SMS account
- **Still issues?** See `OTP_VERIFICATION_DIAGNOSTIC.md` for troubleshooting

---

✓ **Status: Ready to enable OTP**
