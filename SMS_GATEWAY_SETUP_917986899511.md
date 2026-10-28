# SMS Gateway Setup for +917986899511 (Mobile Phone)

## Goal
Send all OTP verification codes to **+917986899511** using your phone's SMS gateway.

---

## Prerequisites

Your phone (+917986899511) must have:
- SMS gateway app installed
- Active internet connection (WiFi or mobile data)
- SIM card with SMS capability

---

## Step-by-Step Setup

### Step 1: Install SMS Gateway App on +917986899511 Phone

#### For Android:
1. Open **Google Play Store**
2. Search for: **"SMS Gateway by Kaffo"**
3. Install the app
4. Open the app
5. Go to **Settings** → **API Server**
6. Enable "API Server"
7. Set Port: `9090`
8. Take note of the **IP Address** shown (e.g., `192.168.1.100`)

#### For iOS:
1. Open **App Store**
2. Search for: **"SMS Gateway"**
3. Install the app
4. Open the app
5. Go to **Settings** → **HTTP Server**
6. Enable "HTTP Server"
7. Set Port: `9090`
8. Take note of the **IP Address** shown

---

### Step 2: Find Your Phone's IP Address on Computer Network

Your phone's IP will be displayed in the SMS gateway app (e.g., `192.168.1.100` or `192.168.1.50`).

**Example from app:**
```
API Server Running
Address: http://192.168.1.100:9090
Status: Ready to receive requests
```

**Write down your IP:** ________________

---

### Step 3: Test Connection from Computer

Open Terminal/CMD on your computer and test if you can reach the phone:

```bash
# Replace 192.168.1.100 with YOUR phone's IP
curl http://192.168.1.100:9090/status

# Expected response:
# {
#   "status": "running",
#   "version": "1.0"
# }
```

If it works → Continue to Step 4

If it fails:
- Make sure phone is on same WiFi network as computer
- Check phone firewall settings
- Make sure SMS gateway app is running
- Try restarting the app

---

### Step 4: Update `.env.local`

Edit `.env.local` in your project and add/update:

```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.1.100:9090
```

**Replace `192.168.1.100` with YOUR phone's actual IP address.**

**Example:**
```env
DATABASE_URL=postgresql://...
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.1.100:9090
AUTH_PROVIDER=postgres
```

---

### Step 5: Restart Server

Stop your server (Ctrl+C) and restart:

```bash
npm run dev
```

You should see in console:
```
✓ ready - started server on 0.0.0.0:3000
```

---

### Step 6: Test OTP to +917986899511

Send OTP request:

```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511"}'
```

**Response:**
```json
{
  "data": {
    "phone": "917986899511",
    "expiresAt": "2025-10-28T12:00:00.000Z"
  }
}
```

---

### Step 7: Check Your Phone

**On your phone (+917986899511):**
1. Open **SMS app**
2. Check **Inbox**
3. Look for message from "TABLETRAIL":
```
Your TableTrail OTP is: 123456. Valid for 5 minutes.
```

**If SMS arrived → Success!** ✓

---

### Step 8: Verify OTP Login

Use the code from the SMS to verify:

```bash
# Replace 123456 with actual OTP from SMS
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511", "code": "123456"}'
```

**Expected Response:**
```json
{
  "id": "user-123",
  "name": "New customer",
  "phone": "917986899511",
  "role": "CUSTOMER"
}
```

---

## Complete Flow

```
User tries to login
  ↓
Enter phone: +917986899511
  ↓
Server generates 6-digit OTP
  ↓
Server sends HTTP request to phone's SMS gateway
  POST http://192.168.1.100:9090/send
  {
    "phone": "917986899511",
    "message": "Your TableTrail OTP is: 123456..."
  }
  ↓
Your phone (+917986899511) receives request
  ↓
SMS Gateway app on phone processes it
  ↓
Your phone sends SMS using SIM card
  ↓
User receives SMS: "Your TableTrail OTP is: 123456"
  ↓
User enters code in app
  ↓
Server verifies code
  ↓
User logged in ✓
```

---

## Troubleshooting

### Problem: "Connection refused" when testing with curl

**Cause:** Phone not reachable on network

**Solution:**
1. Verify phone is on same WiFi network
2. Check IP address in SMS gateway app (write it down again)
3. Check Windows Firewall isn't blocking it
4. Try disabling phone's firewall
5. Test again: `curl http://your-phone-ip:9090/status`

### Problem: OTP not received on phone

**Cause 1:** SMS Gateway app not running
- Solution: Open app on phone, check "API Server" is enabled

**Cause 2:** Phone out of SMS balance
- Solution: Check phone has SMS credit/balance

**Cause 3:** Wrong IP address
- Solution: Check app again, update `.env.local`

**Cause 3:** Server not restarted after `.env.local` change
- Solution: Kill server (Ctrl+C) and restart: `npm run dev`

### Problem: OTP verification fails

**Cause:** Code expired (5 minute limit)
- Solution: Request new OTP, verify within 5 minutes

### Problem: Multiple users need to login

**Current Setup:** All SMS send to +917986899511

If you want different users to receive SMS to their own numbers:
- Phone number is entered by user during login
- SMS will be sent to THAT user's phone number
- But SMS is still sent FROM your phone's SIM (+917986899511)

This is the correct behavior for a real SMS gateway.

---

## Security Notes

- ⚠️ Only use on trusted WiFi network
- ⚠️ Don't expose phone's SMS gateway to the internet
- ⚠️ Keep phone on same network as development computer
- ⚠️ Disable when not in use

---

## Testing Checklist

- [ ] SMS gateway app installed on +917986899511 phone
- [ ] App shows IP address and "Running" status
- [ ] `curl` test to phone's IP works
- [ ] `.env.local` updated with `SMS_PROVIDER=mobile-gateway`
- [ ] `.env.local` updated with correct `MOBILE_GATEWAY_URL`
- [ ] Server restarted: `npm run dev`
- [ ] OTP request sent via curl
- [ ] SMS received on +917986899511 phone
- [ ] OTP code used to verify login
- [ ] User logged in successfully ✓

---

## Next Steps

1. **Now:** Follow all 8 steps above
2. **Test:** Send OTP and verify SMS arrives
3. **Integration:** Your app's login form can now send OTP to any user's phone
4. **Production:** Consider switching to Fast2SMS or Twilio for reliability

---

## Support

If SMS not working:
1. Check phone is running SMS gateway app
2. Check network connection (same WiFi)
3. Check `.env.local` has correct IP
4. Check server is restarted after `.env.local` change
5. Try restarting phone's SMS gateway app
6. Check phone has SMS balance

**All OTP will send from +917986899511 to requested phone numbers using this setup.** ✓
