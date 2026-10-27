const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const restaurants = [
  { id: "pepper-bloom", name: "Pepper & Bloom", description: "Seasonal comfort food with bright, generous flavours.", rating: 4.7, deliveryMinutes: 28, deliveryFee: 3900, priceForTwo: 65000, vegetarian: true },
  { id: "tokyo-table", name: "Tokyo Table", description: "Hand-rolled sushi, ramen and small plates.", rating: 4.5, deliveryMinutes: 35, deliveryFee: 4900, priceForTwo: 110000, vegetarian: false },
  { id: "the-dosa-room", name: "The Dosa Room", description: "Crisp dosas, filter coffee and homestyle chutneys.", rating: 4.8, deliveryMinutes: 22, deliveryFee: 0, priceForTwo: 35000, vegetarian: true },
  { id: "midnight-cravings", name: "Midnight Cravings", description: "Smash burgers and loaded fries for late-night plans.", rating: 4.3, deliveryMinutes: 31, deliveryFee: 2900, priceForTwo: 50000, vegetarian: false, open: false },
];
const menuItems = [
  ["pb-bowl", "pepper-bloom", "House favourites", "Charred paneer grain bowl", "Smoky paneer, grains, greens and tamarind dressing.", 28900, true],
  ["pb-chicken", "pepper-bloom", "House favourites", "Butter chicken pot pie", "Creamy tomato gravy under a flaky pastry lid.", 34900, false],
  ["pb-cake", "pepper-bloom", "Desserts", "Jaggery tres leches", "A soft milk cake with toasted coconut.", 16900, true],
  ["tt-ramen", "tokyo-table", "Ramen", "Miso sesame ramen", "Rich miso broth, noodles, corn and mushrooms.", 39900, true],
  ["tt-sushi", "tokyo-table", "Sushi", "Spicy salmon uramaki", "Salmon, cucumber and chilli mayo.", 54900, false],
  ["dr-masala", "the-dosa-room", "Dosas", "Ghee podi masala dosa", "Crisp dosa, potato masala and house podi.", 18900, true],
  ["dr-idli", "the-dosa-room", "Breakfast", "Thatte idli platter", "Soft idli, sambar and three chutneys.", 14900, true],
  ["mc-smash", "midnight-cravings", "Burgers", "Double pepper smash", "Two patties, cheddar, pickles and pepper sauce.", 32900, false],
];

async function main() {
  if (process.env.ADMIN_PHONE) await prisma.user.upsert({ where: { phone: process.env.ADMIN_PHONE }, update: { role: "ADMIN" }, create: { phone: process.env.ADMIN_PHONE, name: "TableTrail administrator", role: "ADMIN" } });
  for (const restaurant of restaurants) await prisma.restaurant.upsert({ where: { id: restaurant.id }, update: restaurant, create: restaurant });
  for (const [id, restaurantId, category, name, description, price, vegetarian] of menuItems) {
    await prisma.menuItem.upsert({ where: { id }, update: { restaurantId, category, name, description, price, vegetarian }, create: { id, restaurantId, category, name, description, price, vegetarian } });
  }
}

main().finally(() => prisma.$disconnect());
