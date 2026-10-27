"use client";

import { useMemo, useState } from "react";
import { restaurants, searchRestaurants } from "@/lib/domain";

const cuisines = ["All", "Modern Indian", "Japanese", "South Indian", "Burgers"];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [vegetarian, setVegetarian] = useState(false);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => searchRestaurants(query, {
    cuisine: cuisine === "All" ? undefined : cuisine,
    vegetarian,
    open,
  }), [query, cuisine, vegetarian, open]);

  return (
    <>
      <header className="topbar">
        <div className="shell nav">
          <a className="logo" href="/">table<span>trail</span></a>
          <nav className="navlinks" aria-label="Primary navigation">
            <a href="#discover">Discover</a><a href="#collections">Collections</a><a href="#business">For restaurants</a>
          </nav>
          <a className="button ghost" href="/account">Sign in</a>
        </div>
      </header>
      <main>
        <div className="shell">
          <section className="hero">
            <div>
              <div className="eyebrow">Good food, closer to you</div>
              <h1>Find your next favourite meal.</h1>
              <p className="lede">Discover thoughtful local kitchens, order what you love, and follow every step from their door to yours.</p>
              <div className="searchbar">
                <input aria-label="Search restaurants and dishes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search restaurants, dishes or cuisines" />
                <button className="button primary" type="button" onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })}>Explore food</button>
              </div>
            </div>
            <div className="hero-card">
              <div className="hero-card-content"><div className="eyebrow">Tonight's pick</div><h3 style={{ margin: "8px 0" }}>The Dosa Room</h3><div className="meta"><span className="rating">★ 4.8</span><span>22 min</span><span>Pure veg</span></div></div>
            </div>
          </section>
          <section className="section" id="discover">
            <div className="section-head"><div><div className="eyebrow">Near your table</div><h2>Popular around you</h2></div><p>{results.length} places found</p></div>
            <div className="filters" aria-label="Restaurant filters">
              {cuisines.map((item) => <button key={item} className={`filter ${cuisine === item ? "active" : ""}`} onClick={() => setCuisine(item)} type="button">{item}</button>)}
              <button className={`filter ${vegetarian ? "active" : ""}`} onClick={() => setVegetarian(!vegetarian)} type="button">Vegetarian</button>
              <button className={`filter ${open ? "active" : ""}`} onClick={() => setOpen(!open)} type="button">Open now</button>
            </div>
            <div className="grid">
              {results.map((restaurant) => <a className="restaurant" href={`/restaurants/${restaurant.id}`} key={restaurant.id}>
                <div className={`restaurant-image ${restaurant.accent}`}><span>{restaurant.image}</span><span className="pill">{restaurant.open ? "Open now" : "Closed"}</span></div>
                <div className="restaurant-body"><h3>{restaurant.name}</h3><p>{restaurant.description}</p><div className="meta"><span className="rating">★ {restaurant.rating}</span><span>{restaurant.reviews.toLocaleString()} reviews</span><span>{restaurant.deliveryMinutes} min</span></div><div className="chips">{restaurant.tags.map((tag) => <span className="chip" key={tag}>{tag}</span>)}</div></div>
              </a>)}
              {!results.length && <div className="empty">No places match these filters. Try another dish or cuisine.</div>}
            </div>
          </section>
        </div>
      </main>
      <footer className="footer"><div className="shell">TableTrail is an independent product concept. Built for local discovery and fair marketplace operations.</div></footer>
    </>
  );
}
