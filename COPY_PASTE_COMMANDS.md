# COPY-PASTE COMMANDS - TODAY'S SETUP

## Step 1: Copy Environment Template & Fill Secrets

```bash
# Copy template to .env.prod.local
cp .env.prod.template .env.prod.local

# Edit .env.prod.local with your favorite editor (nano/vim/VSCode)
# Update ONLY these lines with your actual keys:

# PAYMENT_SECRET - Get from Razorpay Dashboard > Settings > API Keys
# Format: KEY_ID:KEY_SECRET
# Example: rzp_live_abc123:secret_xyz789
PAYMENT_SECRET=your_razorpay_key_id:your_razorpay_key_secret

# SMS_API_KEY - Get from Fast2SMS Dashboard > My API
# Example: xxxxxx1234567890xxxxxx
SMS_API_KEY=your_fast2sms_api_key

# SMS_SENDER_ID - Your registered sender ID (max 6 chars)
# Make sure this is pre-approved in Fast2SMS dashboard
SMS_SENDER_ID=TABLETRAIL

# MAPS_API_KEY - Get from Mapbox Dashboard > Tokens
# Example: pk_live_abc123xyz789
MAPS_API_KEY=your_mapbox_public_token

# ADMIN_PHONE - Your personal phone for first admin access
# Format: +COUNTRY_CODE + NUMBER
# Example: +919876543210 (India)
ADMIN_PHONE=+919876543210

# Keep these as-is (already generated):
SESSION_SECRET=605936a0cabe4b808ffee91510f009ea
METRICS_TOKEN=7193632c41dc4da890ac29d799f9baec

# For local testing, keep PostgreSQL settings:
DATABASE_URL=postgresql://tabletrail:[REDACTED]@postgres:5432/tabletrail
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_APP_URL=https://tabletrail.co.in

# Add to .gitignore to never commit secrets:
# .env.prod.local
# .env.*.local
```

---

## Step 2: Test Locally with Development Settings

```bash
# Start with your current dev setup (OTP in console, test payment)
docker compose up --build --pull always

# Wait for all services to be healthy
# Output should show:
# tabletrail-app        | ready - started server on 0.0.0.0:3000
# postgres/redis should show "healthy"

# Wait ~30s for migrations to run automatically
```

**Test in browser:**
- http://localhost:3000 (browse restaurants)
- http://localhost:3000/account (sign up - OTP in console)
- http://localhost:3000/partner (partner dashboard)
- http://localhost:3000/delivery (delivery dashboard)

---

## Step 3: Test Rate Limiting

```bash
# Open terminal/PowerShell in project directory

# Test 1: OTP rate limit (should allow 5 per hour)
echo "Testing OTP rate limit..."
for i in {1..6}; do
  echo "Request $i:"
  curl -s -X POST http://localhost:3000/api/auth/request-otp \
    -H "Content-Type: application/json" \
    -d "{\"phone\": \"+919876543210\"}" | jq .error 2>/dev/null || echo "(no error - request OK)"
  sleep 0.5
done

# 6th request should show: "Too many requests. Please try again later."
```

---

## Step 4: Test Full Checkout Flow (Manual)

```
1. Open browser: http://localhost:3000
2. Look for "Explore food" button → click
3. Browse restaurants
4. Click any restaurant → view menu
5. Add items to cart (click "+" buttons)
6. Click "Go to checkout"
7. Fill delivery details:
   - Name: Your name
   - Phone: +919876543210
   - Address: Your address
8. Click "Confirm and pay"
9. See order confirmation → Track order
```

---

## Step 5: Verify All Services Healthy

```bash
# Check status
docker compose ps

# Should show:
# tabletrail-postgres    "docker-entrypoint.s…"   postgres      Up 2 minutes (healthy)
# tabletrail-redis       "docker-entrypoint.s…"   redis         Up 2 minutes (healthy)
# tabletrail-app         "docker-entrypoint.s…"   app           Up 1 minute  (healthy)

# Test endpoints
curl http://localhost:3000/api/health/ready
# Response: {"status":"ok"} if everything is good
```

---

## All Done Today! ✅

Your TableTrail is ready with:
- ✅ Razorpay payment provider (production-ready)
- ✅ Fast2SMS OTP delivery (production-ready)
- ✅ Rate limiting (5 OTPs/hour, 10 orders/hour per user)
- ✅ Non-root Docker user (security)
- ✅ Production environment template

**Next week:**
1. Test with production credentials
2. Set up PostgreSQL + Redis (managed services)
3. Deploy to Vercel
4. Add HTTPS

See `PRODUCTION_SETUP_TODAY.md` for detailed walkthrough!
