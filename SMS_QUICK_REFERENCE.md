# SMS Setup Quick Reference - +917986899511

## TL;DR (60 Seconds)

1. **Phone: +917986899511**
   - Install "SMS Gateway by Kaffo" app (Android) or "SMS Gateway" (iOS)
   - Enable API server in app
   - Note the IP address shown

2. **Computer: Edit `.env.local`**
   ```env
   SMS_PROVIDER=mobile-gateway
   MOBILE_GATEWAY_URL=http://192.168.1.100:9090
   ```
   (Replace IP with your phone's IP from step 1)

3. **Restart server**
   ```bash
   npm run dev
   ```

4. **Test OTP**
   ```bash
   curl -X POST http://localhost:3000/api/auth/request-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+917986899511"}'
   ```

5. **Check phone for SMS** ✓

---

## How It Works

```
User requests OTP
  ↓
Server → Your phone (+917986899511)
  ↓
Phone sends SMS via SIM card
  ↓
User receives OTP
```

---

## Configuration

| Item | Value |
|------|-------|
| SMS Provider | mobile-gateway |
| Sending Phone | +917986899511 |
| App Required | SMS Gateway app |
| Network | Same WiFi |
| Port | 9090 |
| `.env.local` | See below |

---

## `.env.local` Settings

```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://YOUR_PHONE_IP:9090
```

**Find YOUR_PHONE_IP in the SMS Gateway app.**

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Check phone is on same WiFi, check IP address |
| SMS not received | Check app is running, check SMS balance on phone |
| OTP verification fails | Code expires after 5 minutes, request new one |
| Server error | Restart: `npm run dev` after changing `.env.local` |

---

## Commands

```bash
# Check phone is reachable (replace IP):
curl http://192.168.1.100:9090/status

# Request OTP:
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511"}'

# Verify OTP (replace 123456 with code from SMS):
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511", "code": "123456"}'
```

---

## Success Criteria

✓ SMS Gateway app running on +917986899511  
✓ `.env.local` has `SMS_PROVIDER=mobile-gateway`  
✓ `.env.local` has correct phone IP  
✓ Server restarted  
✓ OTP request succeeds  
✓ SMS arrives on phone  
✓ OTP verification works  

---

**See SMS_GATEWAY_SETUP_917986899511.md for detailed guide.**
