# SMS Gateway Configuration - Working Setup

## Your Configuration

```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.1.2:8080/send-sms
```

This is correctly configured in `.env.local`.

---

## How to Test

### 1. Verify SMS Gateway App is Running

On your phone (+917986899511):
- Open SMS gateway app
- Check it shows: **"API Running"** or **"Server Active"**
- Confirm the URL displayed matches: `http://192.168.1.2:8080/send-sms`

---

### 2. Test Connection from Computer

```bash
# Test if phone is reachable
curl http://192.168.1.2:8080/send-sms

# Expected: Should connect (may get 405 or error, but NOT timeout)
```

If this times out → Phone not reachable

If it connects → Phone is reachable ✓

---

### 3. Restart Server

```bash
npm run dev
```

You should see:
```
[MOBILE SMS] Gateway initialized: http://192.168.1.2:8080/send-sms
```

---

### 4. Request OTP

```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511"}'
```

---

### 5. Check Server Console

Should show:
```
[MOBILE SMS] Attempting to send to 917986899511
[MOBILE SMS] Gateway URL: http://192.168.1.2:8080/send-sms
[MOBILE SMS] Request body: phone=917986899511, message=Your TableTrail OTP is: ...
[MOBILE SMS] Response status: 200
[MOBILE SMS] Response body: {success response from app}
[MOBILE SMS] ✓ Sent
```

---

### 6. Check Phone for SMS

Your phone should have received SMS in inbox.

---

## Troubleshooting

### Problem: "Connect Timeout Error"

**Cause:** Phone not reachable

**Check:**
1. Is SMS gateway app running on your phone?
2. Are computer and phone on same WiFi network?
3. Is the IP correct? (should be `192.168.1.2`)
4. Is the port correct? (should be `8080`)

**Fix:**
```bash
# Test connection
curl http://192.168.1.2:8080/send-sms

# If timeout: check phone app is running
# If connects: continue to step 4
```

### Problem: "405 Method Not Allowed"

**Expected:** POST to `/send-sms` requires specific parameters

**Fix:**
Request OTP again: `curl -X POST ...` (see Step 4 above)

### Problem: SMS not received

**Causes:**
1. Phone app returned error (check console logs)
2. Phone number format wrong
3. Phone doesn't have SMS credit

**Check Console:**
```
[MOBILE SMS] Response status: 200
[MOBILE SMS] Response body: ...
```

Look at the response body for error message.

---

## Expected Console Output (Success)

When requesting OTP:
```
[MOBILE SMS] Gateway initialized: http://192.168.1.2:8080/send-sms
[MOBILE SMS] Attempting to send to 917986899511
[MOBILE SMS] Gateway URL: http://192.168.1.2:8080/send-sms
[MOBILE SMS] Request body: phone=917986899511, message=Your TableTrail OTP is: 123456...
[MOBILE SMS] Response status: 200
[MOBILE SMS] Response body: {"success":true,"message_id":"..."}
[MOBILE SMS] ✓ Sent (ID: ...)
```

Then:
```
POST /api/auth/request-otp 200
```

---

## Complete Test Scenario

1. **Start server:** `npm run dev`
2. **Verify SMS gateway app is running** on your phone
3. **Test connection:**
   ```bash
   curl http://192.168.1.2:8080/send-sms
   ```
4. **Request OTP:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/request-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+917986899511"}'
   ```
5. **Check console** for success message
6. **Check phone inbox** for SMS
7. **Verify OTP:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+917986899511", "code": "XXXXXX"}'
   ```
8. **Success!** User logged in ✓

---

## Debugging: Check Phone App API

Your SMS gateway app may have a test endpoint:

```bash
# Some apps have /status endpoint
curl http://192.168.1.2:8080/status

# Or /health
curl http://192.168.1.2:8080/health

# Or /info
curl http://192.168.1.2:8080/info
```

This helps verify the app is running and the IP/port are correct.

---

## Summary

✅ Configuration: `http://192.168.1.2:8080/send-sms`
✅ Phone: +917986899511  
✅ Provider: mobile-gateway  
✅ Code: Updated with better error logging  

**Next: Start server and test OTP request**

See console for detailed error messages if something fails.
