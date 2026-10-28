# HttpSMS Authentication - Configured ✅

## Setup Details

You're using **HttpSMS** - a phone-based SMS service.

**Configuration:**
```env
MOBILE_GATEWAY_URL=http://192.168.1.10:8082
MOBILE_GATEWAY_TOKEN=pk_Fxs1Smkcuc3xvAfCKFdjljbqkPnDJ46M0NeZ7tj5zO4XXlOu6_YVxgewszUO9e6g
```

**Authentication:** Basic Auth with API key

---

## How It Works

```
Request OTP
  ↓
Server → HttpSMS at 192.168.1.10:8082
  + Authorization: Basic <base64-encoded-token>
  ↓
Phone receives request
  ↓
SMS sent via phone's SIM
  ↓
User receives OTP ✓
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
[MOBILE SMS] Gateway initialized: http://192.168.1.10:8082
[MOBILE SMS] Authentication: Basic Auth (pk_Fxs1Smkcuc3...)
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
[MOBILE SMS] ✓ Sent
POST /api/auth/request-otp 200
```

**Check your phone for SMS**

### 5. Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511", "code": "XXXXXX"}'
```

---

## If Still 401

This could mean:
1. HttpSMS phone app needs different API key format
2. HttpSMS requires additional headers
3. Token needs to be URL-encoded

Let me know if it still fails and I'll adjust the authentication method.

---

**Restart server and test!**
