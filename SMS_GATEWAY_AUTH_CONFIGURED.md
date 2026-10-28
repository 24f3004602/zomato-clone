# Mobile Gateway SMS - Authentication Configured ✅

## What Changed

Added authentication token to the SMS gateway provider:

```env
MOBILE_GATEWAY_URL=http://192.168.1.10:8082/send-sms
MOBILE_GATEWAY_TOKEN=evwZI19iSO2468KLAWxwMS:APA91bFe1DE1B_Kfaso36zISNxxtzgTzVs_4rNSx-LY1aCa_fiNJnpscVkP4PKbQ-7FzFoa9aC1M2qY8RZr1VuWMQJNrxTZ-FqUDHHh3TJOIZXnzln2Fpi0
```

Now sends requests with:
```
Authorization: Bearer <your-token>
```

---

## Test Now

### 1. Stop server (Ctrl+C)

### 2. Start fresh
```bash
npm run dev
```

You should see:
```
[MOBILE SMS] Gateway initialized: http://192.168.1.10:8082/send-sms
[MOBILE SMS] Authentication: Token-based (evwZI19iSO...)
✓ ready - started server on 0.0.0.0:3000
```

### 3. Request OTP
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511"}'
```

### 4. Check console

**Success:**
```
[MOBILE SMS] Attempting to send to 917986899511
[MOBILE SMS] Gateway URL: http://192.168.1.10:8082/send-sms
[MOBILE SMS] Request body: phone=917986899511, message=Your TableTrail OTP is: XXXXX...
[MOBILE SMS] Response status: 200
[MOBILE SMS] ✓ Sent
```

**Check your phone for SMS** ✓

### 5. If still 401 error

The token might need to be sent differently. Check your SMS gateway app docs for:
- Exact header name (might be `X-API-Key` instead of `Authorization`)
- Token format (might not need `Bearer` prefix)
- Different parameter format

Let me know the error and I'll adjust.

### 6. Verify OTP once SMS arrives
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511", "code": "XXXXX"}'
```

---

## Flow

```
Request OTP
  ↓
Server → 192.168.1.10:8082/send-sms
  + Authorization: Bearer <token>
  ↓
Phone app validates token
  ↓
SMS sent from your phone
  ↓
User receives OTP ✓
```

---

**Test it and let me know if SMS arrives!**
