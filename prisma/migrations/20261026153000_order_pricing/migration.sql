ALTER TABLE "MenuItem" ADD COLUMN "inventoryCount" INTEGER;
ALTER TABLE "Order" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "OrderItem" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

UPDATE "Restaurant" SET "deliveryFee" = "deliveryFee" * 100, "priceForTwo" = "priceForTwo" * 100;
UPDATE "MenuItem" SET "price" = "price" * 100;
