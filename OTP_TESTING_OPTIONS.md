# FASTEST Way to Test OTP Without External Service

## Option 1: Console Logging (30 seconds - No app needed)

Perfect for immediate testing. OTP codes appear in server console.

### Setup:

1. **Update `.env.local`:**
```env
SMS_PROVIDER=log
```

2. **Restart server:**
```bash
npm run dev
```

3. **Request OTP:**
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'
```

4. **Check server console:**
```
[SMS OTP] Phone: 919999999999, Code: 123456
```

5. **Copy the code and use it** ✓

---

## Option 2: Webhook Logger (60 seconds - See all OTPs)

All OTP codes logged to a URL you can access.

### Setup:

1. **Update `.env.local`:**
```env
SMS_PROVIDER=log
```

2. **Install simple webhook receiver** (Node.js):
```bash
npm install webhook.cool
# Or use: https://webhook.site (free, no install)
```

3. **Get a webhook URL:**
```bash
# Visit https://webhook.site
# Copy the unique URL shown
# Example: https://webhook.site/unique-id
```

4. **Log OTP to webhook:**
```bash
# In your auth.ts, add this line when OTP is generated:
console.log(`OTP for ${phone}: ${code}`);
console.log(`Set OTP at: https://webhook.site/your-id`);

# Or send via curl:
curl -X POST https://webhook.site/your-id \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"919999999999\", \"code\": \"123456\"}"
```

5. **View all OTPs:**
```
Go to: https://webhook.site/your-id
→ See all OTP requests with timestamps
```

---

## Option 3: Database Browser (90 seconds - Best for debugging)

See all stored OTP attempts in database.

### Setup:

1. **Install Prisma Studio:**
```bash
npx prisma studio
```

2. **Browser opens at:**
```
http://localhost:5555
```

3. **Navigate to:**
```
OtpChallenge table
```

4. **See all OTP records:**
| Field | Value |
|-------|-------|
| phone | 919999999999 |
| codeHash | [hashed] |
| expiresAt | 2025-10-28T12:00:00Z |
| createdAt | 2025-10-28T11:55:00Z |

5. **Copy the code** from request and use it ✓

---

## Quick Comparison

| Method | Setup Time | Real SMS? | Effort | Best For |
|--------|-----------|----------|--------|----------|
| Console Log | 30s | ✗ | Minimal | Quick testing |
| Webhook Site | 60s | ✗ | Easy | Seeing history |
| Database | 90s | ✗ | Moderate | Debugging |
| Mobile Gateway | 5min | ✓ | More steps | Real SMS testing |

---

## FASTEST PATH: Console Logging

```bash
# 1. Set SMS_PROVIDER=log in .env.local (already done?)
# 2. Restart: npm run dev
# 3. Request OTP:
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'

# 4. Check console output:
# [SMS OTP] Phone: 919999999999, Code: 123456

# 5. Use code: 123456
```

**That's it. 30 seconds. No external service.**

---

## Want to Test Verification Too?

Once you have the OTP code from console:

```bash
# Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999", "code": "123456"}'

# Expected response (success):
{
  "id": "user-123",
  "name": "New customer",
  "phone": "919999999999",
  "role": "CUSTOMER"
}
```

---

## Next: Real SMS Testing

Once console logging works and you want **real SMS**:

1. Install SMS gateway app on phone (see MOBILE_SMS_GATEWAY_SETUP.md)
2. Get your phone's IP address
3. Update `.env.local` with phone IP
4. Change `SMS_PROVIDER=mobile-gateway`
5. Restart server
6. OTP now sends from your phone ✓

---

**Status: Use console logging for immediate testing** ✓
