export type Restaurant = {
  id: string;
  name: string;
  cuisine: string[];
  description: string;
  rating: number;
  reviews: number;
  deliveryMinutes: number;
  deliveryFee: number;
  priceForTwo: number;
  vegetarian: boolean;
  open: boolean;
  image: string;
  accent: string;
  tags: string[];
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  category: string;
  name: string;
  description: string;
  /** Integer INR paise. */
  price: number;
  vegetarian: boolean;
  available?: boolean;
  popular?: boolean;
};

export type CartLine = MenuItem & { quantity: number };

export const restaurants: Restaurant[] = [
  {
    id: "pepper-bloom",
    name: "Pepper & Bloom",
    cuisine: ["Modern Indian", "North Indian"],
    description: "Seasonal comfort food with bright, generous flavours.",
    rating: 4.7,
    reviews: 1820,
    deliveryMinutes: 28,
    deliveryFee: 3900,
    priceForTwo: 65000,
    vegetarian: true,
    open: true,
    image: "PB",
    accent: "coral",
    tags: ["Bestseller", "Free delivery"],
  },
  {
    id: "tokyo-table",
    name: "Tokyo Table",
    cuisine: ["Japanese", "Asian"],
    description: "Hand-rolled sushi, ramen and small plates.",
    rating: 4.5,
    reviews: 934,
    deliveryMinutes: 35,
    deliveryFee: 4900,
    priceForTwo: 110000,
    vegetarian: false,
    open: true,
    image: "TT",
    accent: "indigo",
    tags: ["New", "Top rated"],
  },
  {
    id: "the-dosa-room",
    name: "The Dosa Room",
    cuisine: ["South Indian", "Breakfast"],
    description: "Crisp dosas, filter coffee and homestyle chutneys.",
    rating: 4.8,
    reviews: 2411,
    deliveryMinutes: 22,
    deliveryFee: 0,
    priceForTwo: 35000,
    vegetarian: true,
    open: true,
    image: "DR",
    accent: "gold",
    tags: ["Pure veg", "Value pick"],
  },
  {
    id: "midnight-cravings",
    name: "Midnight Cravings",
    cuisine: ["Burgers", "Fast Food"],
    description: "Smash burgers and loaded fries for late-night plans.",
    rating: 4.3,
    reviews: 720,
    deliveryMinutes: 31,
    deliveryFee: 2900,
    priceForTwo: 50000,
    vegetarian: false,
    open: false,
    image: "MC",
    accent: "plum",
    tags: ["Late night", "Comfort food"],
  },
];

export const menuItems: MenuItem[] = [
  { id: "pb-bowl", restaurantId: "pepper-bloom", category: "House favourites", name: "Charred paneer grain bowl", description: "Smoky paneer, grains, greens and tamarind dressing.", price: 28900, vegetarian: true, popular: true },
  { id: "pb-chicken", restaurantId: "pepper-bloom", category: "House favourites", name: "Butter chicken pot pie", description: "Creamy tomato gravy under a flaky pastry lid.", price: 34900, vegetarian: false, popular: true },
  { id: "pb-cake", restaurantId: "pepper-bloom", category: "Desserts", name: "Jaggery tres leches", description: "A soft milk cake with toasted coconut.", price: 16900, vegetarian: true },
  { id: "tt-ramen", restaurantId: "tokyo-table", category: "Ramen", name: "Miso sesame ramen", description: "Rich miso broth, noodles, corn and mushrooms.", price: 39900, vegetarian: true, popular: true },
  { id: "tt-sushi", restaurantId: "tokyo-table", category: "Sushi", name: "Spicy salmon uramaki", description: "Salmon, cucumber and chilli mayo.", price: 54900, vegetarian: false, popular: true },
  { id: "dr-masala", restaurantId: "the-dosa-room", category: "Dosas", name: "Ghee podi masala dosa", description: "Crisp dosa, potato masala and house podi.", price: 18900, vegetarian: true, popular: true },
  { id: "dr-idli", restaurantId: "the-dosa-room", category: "Breakfast", name: "Thatte idli platter", description: "Soft idli, sambar and three chutneys.", price: 14900, vegetarian: true },
  { id: "mc-smash", restaurantId: "midnight-cravings", category: "Burgers", name: "Double pepper smash", description: "Two patties, cheddar, pickles and pepper sauce.", price: 32900, vegetarian: false, popular: true },
];

export function searchRestaurants(query: string, filters: { cuisine?: string; vegetarian?: boolean; maxPrice?: number; open?: boolean } = {}) {
  const normalized = query.trim().toLowerCase();
  return restaurants.filter((restaurant) => {
    const matchesText = !normalized || [restaurant.name, restaurant.description, ...restaurant.cuisine, ...restaurant.tags].join(" ").toLowerCase().includes(normalized) || menuItems.some((item) => item.restaurantId === restaurant.id && item.name.toLowerCase().includes(normalized));
    const matchesCuisine = !filters.cuisine || restaurant.cuisine.includes(filters.cuisine);
    const matchesVeg = !filters.vegetarian || restaurant.vegetarian;
    const matchesPrice = !filters.maxPrice || restaurant.priceForTwo <= filters.maxPrice;
    const matchesOpen = !filters.open || restaurant.open;
    return matchesText && matchesCuisine && matchesVeg && matchesPrice && matchesOpen;
  });
}
