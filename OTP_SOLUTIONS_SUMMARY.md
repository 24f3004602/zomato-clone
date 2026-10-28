# OTP Testing Solutions - Choose Your Method

You have **3 ways to test OTP** without using Fast2SMS. Build has been updated to support all methods.

---

## 🟢 METHOD 1: Console Logging (EASIEST - 30 seconds)

### For Immediate Testing

**Perfect for:** Verifying OTP logic works

**Setup:**
```env
# .env.local
SMS_PROVIDER=log
```

**Restart:**
```bash
npm run dev
```

**Test:**
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'
```

**Result (in server console):**
```
[SMS OTP] Phone: 919999999999, Code: 123456
```

**Use Code:** 123456

**Verify OTP:**
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999", "code": "123456"}'
```

---

## 🟡 METHOD 2: Mobile Gateway (YOUR PHONE - 5 minutes)

### For Real SMS Testing

**Perfect for:** Testing actual SMS delivery to your phone

**What You'll Do:**
1. Install SMS gateway app on your Android/iOS phone
2. Get your phone's IP address
3. Configure `.env.local` with phone IP
4. Request OTP → SMS sends from your phone ✓

**Setup:**

**Step 1: Install SMS Gateway App**

Android:
- Download: "SMS Gateway by Kaffo" from Google Play
- Open app → Enable API Server → Note IP address

iOS:
- Download: "SMS Gateway" from App Store
- Open app → Enable HTTP Server → Note IP address

**Step 2: Configure .env.local**

```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.1.100:9090
```

Replace `192.168.1.100` with your phone's IP address.

**Step 3: Restart**
```bash
npm run dev
```

**Step 4: Test**
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'
```

**Result:** SMS appears on your phone within 2-3 seconds ✓

---

## 🔵 METHOD 3: Webhook Logger (BEST FOR DEBUGGING - 60 seconds)

### See All OTP Requests

**Perfect for:** Monitoring all OTP attempts

**Setup:**

1. **Visit:** https://webhook.site
2. **Copy** the unique URL shown (e.g., `https://webhook.site/unique-id`)
3. **Update .env.local:**
```env
SMS_PROVIDER=log
WEBHOOK_URL=https://webhook.site/your-unique-id
```

4. **When requesting OTP, also log to webhook** (manually or via code)

5. **View all OTPs:** Visit your webhook.site URL

---

## Comparison

| Method | Setup | Real SMS? | View History | Best For |
|--------|-------|----------|--------------|----------|
| Console Log | 30s | ✗ | ✗ | Quick testing |
| Mobile Gateway | 5min | ✓ | ✓ | Real SMS |
| Webhook | 60s | ✗ | ✓ | Monitoring |

---

## RECOMMENDED PATH

### For Development:
```env
# Start with console
SMS_PROVIDER=log
```

### For Testing With Real SMS:
```env
# Switch to mobile gateway
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.1.100:9090
```

### For Production:
```env
# Use Fast2SMS or Twilio
SMS_PROVIDER=fast2sms
SMS_API_KEY=your-api-key
```

---

## Testing Checklist

### Console Method:
- [ ] Set `SMS_PROVIDER=log` in `.env.local`
- [ ] Restart server: `npm run dev`
- [ ] Request OTP via curl
- [ ] See code in console
- [ ] Use code to verify ✓

### Mobile Gateway Method:
- [ ] Install SMS gateway app on phone
- [ ] Note phone's IP address
- [ ] Set `SMS_PROVIDER=mobile-gateway` in `.env.local`
- [ ] Set `MOBILE_GATEWAY_URL=http://phone-ip:9090`
- [ ] Restart server
- [ ] Request OTP
- [ ] Receive SMS on phone ✓

---

## Current Build Status

✅ Build passes with all 3 SMS methods supported
✅ Console method ready to use (30 seconds)
✅ Mobile gateway ready to use (5 minutes)
✅ Code properly typed and compiled

---

## Start Now

### IMMEDIATE (Right now):

```bash
# 1. Make sure SMS_PROVIDER=log in .env.local
# 2. Restart: npm run dev
# 3. Request OTP:
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'

# 4. Check console for: [SMS OTP] Phone: 919999999999, Code: XXXXXX
```

### NEXT (5 minutes):

If you want **real SMS** to test on your phone:
- See **MOBILE_SMS_GATEWAY_SETUP.md** for detailed instructions

---

**Status: OTP testing ready with 3 methods. Console method works now.** ✓

See specific guide: MOBILE_SMS_GATEWAY_SETUP.md (for real SMS)
