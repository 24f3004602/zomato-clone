# Mobile Gateway Test - Step by Step

## Configuration Updated ✅

```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.1.10:8082/send-sms
```

---

## Test Steps

### 1. Kill running server (Ctrl+C if running)

### 2. Start fresh
```bash
npm run dev
```

You should see in console:
```
[MOBILE SMS] Gateway initialized: http://192.168.1.10:8082/send-sms
✓ ready - started server on 0.0.0.0:3000
```

### 3. Request OTP
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511"}'
```

### 4. Check console for one of:

**Success:**
```
[MOBILE SMS] Attempting to send to 917986899511
[MOBILE SMS] Gateway URL: http://192.168.1.10:8082/send-sms
[MOBILE SMS] Request body: phone=917986899511, message=Your TableTrail OTP is: XXXXX...
[MOBILE SMS] Response status: 200
[MOBILE SMS] ✓ Sent
POST /api/auth/request-otp 200
```

**Check phone for SMS** ✓

### 5. Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511", "code": "XXXXX"}'
```

Expected:
```json
{
  "id": "user-123",
  "name": "New customer",
  "phone": "917986899511",
  "role": "CUSTOMER"
}
```

---

## If SMS Doesn't Arrive

Check console for error message:
```
[MOBILE SMS] ✗ Failed: ...
[MOBILE SMS] Response body: {...}
```

Look at the response body for the error from your phone's SMS gateway.

---

## Complete Flow

```
User requests OTP (+917986899511)
  ↓
Server → 192.168.1.10:8082/send-sms
  ↓
Your phone app processes request
  ↓
Phone sends SMS via SIM
  ↓
User receives SMS
  ↓
Verify login with OTP code ✓
```

---

**Configuration is set. Ready to test!**
