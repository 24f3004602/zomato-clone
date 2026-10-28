# SMS Gateway Connection Issue - Solutions

## Problem
Phone SMS gateway at 192.168.1.2:8080 is not reachable (connection timeout)

---

## Solution 1: Use Console Logging (Immediate - Works Now)

This bypasses the phone entirely and logs OTP to your server console.

**Setup:**
1. Edit `.env.local`:
```env
SMS_PROVIDER=log
```

2. Restart server:
```bash
npm run dev
```

3. Request OTP:
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511"}'
```

4. Check console output:
```
[SMS OTP] Phone: 917986899511, Code: 912999
```

5. Use that code to verify login ✓

---

## Solution 2: Find Correct Phone IP Address

Your phone might be on a different IP. Let me help you find it:

### On Your Phone:
1. Open the SMS gateway app
2. Look for the IP address displayed in the app
3. Should show something like: `http://192.168.x.x:8080`
4. **Write it down exactly**

### From Your Computer:

**Find all devices on your network:**

```powershell
# List all devices on your WiFi network
arp -a

# Look for your phone's MAC address (search online for your phone model)
# Or look for devices with port 8080 open:
```

**Or use this command to scan:**
```bash
# Install nmap if you don't have it, then:
nmap -p 8080 192.168.1.0/24

# This will find any device with port 8080 open
```

---

## Solution 3: Mobile Gateway with Correct IP

Once you find the correct IP:

1. **Update `.env.local`:**
```env
SMS_PROVIDER=mobile-gateway
MOBILE_GATEWAY_URL=http://YOUR_CORRECT_IP:8080/send-sms
```

2. **Test connection:**
```bash
curl http://YOUR_CORRECT_IP:8080/send-sms
```

If it connects → Update and restart server ✓

---

## FASTEST: Use Console Logging NOW

Since the phone isn't reachable right now:

### Step 1: Update `.env.local`
```env
SMS_PROVIDER=log
```

### Step 2: Restart server
```bash
npm run dev
```

### Step 3: Request OTP
```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511"}'
```

### Step 4: See OTP in console
```
[SMS OTP] Phone: 917986899511, Code: 912999
```

### Step 5: Test verification
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+917986899511", "code": "912999"}'
```

**This works immediately** ✓

---

## Recommendation

**For now:** Use `SMS_PROVIDER=log` to test OTP logic

**Later:** Once you verify the phone's correct IP, switch back to `mobile-gateway`

---

## Checklist

- [ ] Phone SMS gateway app is running
- [ ] Phone and computer on same WiFi
- [ ] Found correct IP address from app
- [ ] Tested connection: `curl http://IP:8080/send-sms`
- [ ] Updated `.env.local` with SMS_PROVIDER
- [ ] Restarted server
- [ ] OTP working ✓

---

## Need Help Finding Phone IP?

**On most phones:**
- Open SMS gateway app
- Look in: Settings, Status, or Home screen
- Should display: `API Server Running at: http://192.168.x.x:PORT`

If you can't find it, you can:
1. Use console logging instead (works now)
2. Restart the SMS gateway app
3. Check phone's WiFi settings for assigned IP address

---

**Start with console logging - it works immediately without phone connection.**
