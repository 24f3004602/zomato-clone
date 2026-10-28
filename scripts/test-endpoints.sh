#!/bin/bash
# Manual test script for Phase 3 & 4 endpoints

BASE_URL="http://localhost:3000"

echo "=== Testing Phase 3: Courier Assignment ==="
echo ""

# Get an order from the database to test with
ORDER_ID="test-order-123"

echo "POST /api/delivery/assign"
curl -X POST "$BASE_URL/api/delivery/assign" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\": \"$ORDER_ID\", \"estimatedDeliveryMinutes\": 30}" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "GET /api/delivery/assign?orderId=$ORDER_ID"
curl "$BASE_URL/api/delivery/assign?orderId=$ORDER_ID" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "=== Testing Phase 4: Order Status ==="
echo ""

echo "GET /api/orders/$ORDER_ID/status"
curl "$BASE_URL/api/orders/$ORDER_ID/status" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "GET /api/orders/$ORDER_ID/status?customerId=customer-123"
curl "$BASE_URL/api/orders/$ORDER_ID/status?customerId=customer-123" \
  -w "\nStatus: %{http_code}\n"
