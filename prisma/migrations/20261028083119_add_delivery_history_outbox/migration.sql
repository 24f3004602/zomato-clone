-- Delivery History & Outbox Migration
-- Add columns to Order table for delivery tracking and estimated delivery time
-- Create the enum before using it in table definitions.
CREATE TYPE "DeliveryStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'ASSIGNED',
    'DELIVERING',
    'DELIVERED'
);

ALTER TABLE "Order" ADD COLUMN "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3);

-- Create DeliveryEvent table for durable order-status history
CREATE TABLE "DeliveryEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "assignedCourierId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- Create OutboxEvent table for transactional outbox pattern
CREATE TABLE "OutboxEvent" (
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
CREATE INDEX "DeliveryEvent_orderId_createdAt_idx" ON "DeliveryEvent"("orderId", "createdAt");
CREATE INDEX "DeliveryEvent_status_createdAt_idx" ON "DeliveryEvent"("status", "createdAt");
CREATE INDEX "Order_deliveryStatus_updatedAt_idx" ON "Order"("deliveryStatus", "updatedAt");
CREATE INDEX "OutboxEvent_orderId_processed_idx" ON "OutboxEvent"("orderId", "processed");
CREATE INDEX "OutboxEvent_processed_createdAt_idx" ON "OutboxEvent"("processed", "createdAt");

-- Add foreign key constraints
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
