import { notFound } from "next/navigation";
import { menuItems, restaurants } from "@/lib/domain";
import RestaurantPage from "./RestaurantPage";

export function generateStaticParams() {
  return restaurants.map((restaurant) => ({ id: restaurant.id }));
}

export default async function RestaurantRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = restaurants.find((item) => item.id === id);
  if (!restaurant) notFound();
  return <RestaurantPage restaurant={restaurant} items={menuItems.filter((item) => item.restaurantId === id)} />;
}
