#!/bin/bash
# Run this script to apply the delivery history + outbox migration
# Usage: npm run db:migrate-delivery

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  exit 1
fi

echo "Applying delivery history & outbox migration..."

psql "$DATABASE_URL" << 'EOF'

-- Delivery History & Outbox Migration
-- Add columns to Order table for delivery tracking and estimated delivery time

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "estimatedDeliveryAt" TIMESTAMP(3);

-- Create DeliveryEvent table for durable order-status history
CREATE TABLE IF NOT EXISTS "DeliveryEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignedCourierId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- Create OutboxEvent table for transactional outbox pattern
CREATE TABLE IF NOT EXISTS "OutboxEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS "DeliveryEvent_orderId_createdAt_idx" ON "DeliveryEvent"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "DeliveryEvent_status_createdAt_idx" ON "DeliveryEvent"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_deliveryStatus_updatedAt_idx" ON "Order"("deliveryStatus", "updatedAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_orderId_processed_idx" ON "OutboxEvent"("orderId", "processed");
CREATE INDEX IF NOT EXISTS "OutboxEvent_processed_createdAt_idx" ON "OutboxEvent"("processed", "createdAt");

-- Add foreign key constraints
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

EOF

echo "✓ Migration applied successfully"
