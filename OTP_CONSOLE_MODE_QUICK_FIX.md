# OTP Testing - Quick Fix (Console Logging)

## Current Status
✅ SMS gateway app configuration not reachable  
✅ Switching to console logging (works immediately)

---

## Configuration Updated

```env
SMS_PROVIDER=log
```

---

## Test OTP Now

### 1. Restart server
```bash
npm run dev
```

### 2. Request OTP
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511"}'
```

### 3. Check console for OTP code
```
[SMS OTP] Phone: 917986899511, Code: 912999
```

### 4. Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511", "code": "912999"}'
```

Expected response:
```json
{
  "id": "user-123",
  "name": "New customer",
  "phone": "917986899511",
  "role": "CUSTOMER"
}
```

---

## How It Works

```
User requests OTP
  ↓
Server generates code (e.g., 912999)
  ↓
Server logs to console: [SMS OTP] Phone: ..., Code: 912999
  ↓
You copy code from console
  ↓
User verifies with code
  ↓
User logged in ✓
```

---

## When Phone Gateway is Fixed

Once you confirm the phone's IP is correct and reachable:

1. Update `.env.local`:
```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.X.X:8080/send-sms
```

2. Restart: `npm run dev`

3. SMS will send from your phone ✓

---

## Status: OTP Working (Console Mode)

✓ Quick test possible right now
✓ Can verify OTP logic
✓ Switch to phone mode once network is fixed

See SMS_CONNECTION_TROUBLESHOOTING.md for diagnosing phone connection.
