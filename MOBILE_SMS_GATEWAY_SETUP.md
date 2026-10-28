# Mobile SMS Gateway Setup - Send OTP from Your Phone

## Overview

Instead of using Fast2SMS, you'll send OTP directly from your mobile phone through an SMS gateway app.

**How it works:**
1. Install SMS gateway app on your phone
2. Configure app to expose HTTP API
3. Configure `.env.local` to point to your phone
4. OTP codes will send from your phone ✓

---

## Step-by-Step Setup

### Step 1: Install SMS Gateway App on Your Phone

#### For Android:
**Option A: SMS Gateway by Kaffo (Recommended - Free)**
1. Install from Google Play: https://play.google.com/store/apps/details?id=com.kaffo.smsgateway
2. Open app
3. Go to Settings → API Server
4. Enable "API Server"
5. Set Port: `9090`
6. Note the IP address shown (e.g., `192.168.1.100`)

**Option B: Tasker + AutoSMS**
1. Install Tasker from Google Play
2. Install AutoSMS plugin
3. Configure Tasker to listen for HTTP requests

#### For iOS:
**SMS Gateway App**
1. Install from App Store: "SMS Gateway"
2. Open app
3. Enable "HTTP Server"
4. Set port to 9090
5. Note the IP address

---

### Step 2: Get Your Phone's IP Address

**On Android:**
- Open SMS gateway app → Settings → Shows IP address
- Example: `192.168.1.100:9090`

**On iOS:**
- Open SMS gateway app → Connection Settings → Shows IP
- Example: `192.168.1.50:9090`

**From Computer (Alternative):**
```bash
# Find your phone on the network
arp -a | grep -i [last-part-of-mac-address]

# Or use your router's admin panel to find connected devices
```

---

### Step 3: Test Phone Connection

On your computer, test if the gateway is reachable:

```bash
# Test connection to your phone's SMS gateway
curl http://192.168.1.100:9090/status

# Expected response:
# {
#   "status": "running",
#   "version": "1.0"
# }
```

If this fails:
- Make sure phone is on same WiFi network as computer
- Check firewall settings
- Make sure SMS gateway app is running on phone

---

### Step 4: Update `.env.local`

Add this line to `.env.local`:

```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.1.100:9090
```

**Example (Replace with YOUR phone's IP):**
```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://192.168.1.100:9090
```

---

### Step 5: Restart Server

```bash
npm run dev
```

---

### Step 6: Test OTP

Request OTP:
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'
```

**Expected:**
1. Request returns success
2. SMS appears in your phone's SMS app within 2-3 seconds ✓
3. OTP code visible in message

---

## How It Works

```
Your Computer (TableTrail App)
    ↓
    POST /api/auth/request-otp
    ↓
    Server generates 6-digit code
    ↓
    Calls SMS provider
    ↓
    Mobile Gateway Provider (new)
    ↓
    HTTP POST to 192.168.1.100:9090/send
    ↓
Your Phone (SMS Gateway App)
    ↓
    App receives request
    ↓
    Phone sends SMS using SIM card ✓
    ↓
Customer receives SMS
```

---

## Troubleshooting

### Issue: "Connection refused" or timeout

**Cause:** Phone not reachable

**Fix:**
1. Check phone is on same WiFi network
2. Verify SMS gateway app is running
3. Check IP address is correct
4. Disable phone firewall (Settings → Firewall)

```bash
# Test connection again
curl http://192.168.1.100:9090/status
```

### Issue: "Gateway returned error"

**Cause:** SMS gateway app error

**Fix:**
1. Open app on phone
2. Check error log in app
3. Verify SIM has SMS balance
4. Restart SMS gateway app

### Issue: Server says "MOBILE_GATEWAY_URL not set"

**Cause:** Environment variable missing from `.env.local`

**Fix:**
```env
MOBILE_GATEWAY_URL=http://192.168.1.100:9090
```

Then restart:
```bash
npm run dev
```

---

## Testing Checklist

- [ ] SMS gateway app installed on phone
- [ ] SMS gateway app is running
- [ ] Phone IP address noted (e.g., 192.168.1.100)
- [ ] `.env.local` updated with `SMS_PROVIDER=mobile-gateway`
- [ ] `.env.local` updated with `MOBILE_GATEWAY_URL=http://your-ip:9090`
- [ ] Server restarted (`npm run dev`)
- [ ] `curl` test to `/status` endpoint works
- [ ] OTP test sent successfully
- [ ] SMS received on phone

---

## Multiple Devices Testing

Want to test sending to different numbers?

1. Set `MOBILE_GATEWAY_URL` to your phone's IP
2. Request OTP for different phone numbers
3. Phone will send SMS to all requested numbers using its SIM card

```bash
# Send to your phone
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999"}'

# Phone sends SMS ✓
```

---

## Security Note

- Only use this setup for **testing/development**
- Don't expose phone's SMS gateway to the internet
- Phone must be on trusted network only
- In production, use Fast2SMS, Twilio, or similar service

---

## Next Steps (After Testing)

Once you verify OTP works:

1. ✓ Test login flow
2. ✓ Test order creation with phone
3. ✓ Test notifications
4. For production: Switch to Fast2SMS or Twilio

---

## Support

**SMS Gateway App Not Working?**
- Check app's built-in logs
- Try restarting phone
- Check WiFi connection
- Try different port (e.g., 8080 instead of 9090)

**Still having issues?**
1. Check phone's SMS gateway app manual
2. Verify network connectivity
3. Look at server logs (`npm run dev` console)

---

**Status: Ready to send OTP from your mobile phone** ✓
