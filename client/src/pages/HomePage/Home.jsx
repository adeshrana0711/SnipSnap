import React, { useEffect, useState } from "react";
import "../../styles/home.css";
import { Link, useNavigate } from "react-router-dom";
const readApiResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  if (!contentType.includes("application/json")) {
    if (body.trimStart().toLowerCase().startsWith("<!doctype") ||
        body.trimStart().startsWith("<html")) {
      throw new Error(
        "The server returned a web page instead of JSON. Check your API URL and Vite/Vercel proxy or rewrite configuration."
      );
    }
    throw new Error("The server returned an unexpected response.");
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error("The server returned invalid JSON.");
  }
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }
  return data;
};
// Use the same-origin Vercel API. Pass Express route paths without a leading /api
// (for example "/shop/shops" and "/me") to avoid accidentally creating "/api/api/...".
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const apiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
const Home = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [placeName, setPlaceName] = useState(() => localStorage.getItem("snipsnap-place-name") || "");
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [nearbyFallback, setNearbyFallback] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const loadShops = async (url = "/api/shop/shops") => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl(url), { credentials: "include" });
      const data = await readApiResponse(response);
      setShops(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Shop API error:", err);
      setError(err.message || "Unable to load barber shops. Please try again.");
      setShops([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    const checkUser = async () => {
      try {
        const response = await fetch(apiUrl("/me"), { credentials: "include" });
        const data = await readApiResponse(response);
        if (active && data.loggedIn && data.role === "client") {
          setIsLoggedIn(true);
          setUserRole(data.role);
        }
      } catch (err) {
        // The public home page should still work if the login-status endpoint fails.
        console.error("Error checking login status:", err);
      }
    };
    checkUser();
    const savedCoordinates = localStorage.getItem("snipsnap-location-coordinates");
    const savedCity = localStorage.getItem("snipsnap-city-search");
    if (savedCoordinates) {
      try {
        const point = JSON.parse(savedCoordinates);
        if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
          loadNearbyAtCoordinates(point.lat, point.lng, false);
        } else if (savedCity) {
          setCitySearch(savedCity);
          searchByCity({ preventDefault() {} }, savedCity);
        } else {
          loadShops();
        }
      } catch {
        if (savedCity) {
          setCitySearch(savedCity);
          searchByCity({ preventDefault() {} }, savedCity);
        } else {
          loadShops();
        }
      }
    } else if (savedCity) {
      setCitySearch(savedCity);
      searchByCity({ preventDefault() {} }, savedCity);
    } else {
      loadShops();
    }
    return () => {
      active = false;
    };
  }, []);
  const openShopCount = shops.filter((shop) => {
    const status = String(shop.status || "").toLowerCase();
    return status === "open";
  }).length;
  const goToShop = (shop) => {
    if (String(shop.status || "").toLowerCase() === "open") {
      navigate(`/shop/${shop._id}`);
    }
  };
  // Distance between two latitude/longitude points, in kilometres.
  const distanceInKm = (lat1, lon1, lat2, lon2) => {
    const toRadians = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const getCityCoordinates = async (city) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(city)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) throw new Error("Could not locate that city or area.");
    const results = await response.json();
    if (!Array.isArray(results) || !results.length) return null;
    return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
  };
  const searchByCity = async (event, locationOverride = "") => {
    event?.preventDefault?.();
    const city = (locationOverride || citySearch).trim();
    if (!city) {
      setLocationMessage("Enter a city or area, for example Kalka, Haryana.");
      return;
    }
    setLocationPickerOpen(false);
    setCitySearch(city);
    setPlaceName(city);
    localStorage.setItem("snipsnap-place-name", city);
    localStorage.setItem("snipsnap-city-search", city);
    localStorage.removeItem("snipsnap-location-coordinates");
    setLocationMessage(`Searching within 20 km of ${city}…`);
    setNearbyFallback(false);
    setLoading(true);
    setError("");
    try {
      // Geocode the searched place first so every result is checked against
      // the same 20 km radius (even if the backend city filter is too broad).
      const center = await getCityCoordinates(city);
      if (!center) {
        setShops([]);
        setLocationMessage(`Could not find "${city}". Try a city and state, e.g. Kalka, Haryana.`);
        return;
      }
      const response = await fetch(apiUrl("/shop/shops"), { credentials: "include" });
      const data = await readApiResponse(response);
      const allShops = Array.isArray(data) ? data : [];
      const withinRadius = allShops
        .map((shop) => {
          const coordinates = shop.coordinates?.coordinates;
          if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
          // GeoJSON coordinates are stored as [longitude, latitude].
          const distance = distanceInKm(
            center.lat,
            center.lng,
            Number(coordinates[1]),
            Number(coordinates[0])
          );
          return Number.isFinite(distance) ? { shop, distance } : null;
        })
        .filter((item) => item && item.distance <= 20)
        .sort((a, b) => a.distance - b.distance);
      // Show shops from the searched city AND nearby towns (for example,
      // Pinjore when searching Kalka), provided they are within 20 km.
      // `withinRadius` is already sorted from nearest to farthest.
      setShops(withinRadius.map((item) => item.shop));
      setNearbyFallback(false);
      setLocationMessage(
        withinRadius.length
          ? `Showing ${withinRadius.length} shop(s) within 20 km of ${city}, closest first.`
          : `No barber shops found within 20 km of ${city}.`
      );
    } catch (err) {
      console.error("City/nearby shop search error:", err);
      setError(err.message || "Unable to search shops. Please try again.");
      setShops([]);
      setLocationMessage("");
    } finally {
      setLoading(false);
    }
  };
  const loadNearbyAtCoordinates = async (lat, lng, updateStorage = true) => {
    setLoading(true);
    setError("");
    try {
      if (updateStorage) {
        localStorage.setItem("snipsnap-location-coordinates", JSON.stringify({ lat, lng }));
        localStorage.removeItem("snipsnap-city-search");
      }
      const allResponse = await fetch(apiUrl("/shop/shops"), { credentials: "include" });
      const allShops = await readApiResponse(allResponse);
      const allList = Array.isArray(allShops) ? allShops : [];
      const within20Km = allList
        .map((shop) => {
          const point = shop.coordinates?.coordinates;
          if (!Array.isArray(point) || point.length !== 2) return null;
          const distance = distanceInKm(lat, lng, Number(point[1]), Number(point[0]));
          return Number.isFinite(distance) ? { shop, distance } : null;
        })
        .filter((item) => item && item.distance <= 20)
        .sort((a, b) => a.distance - b.distance);
      setShops(within20Km.map((item) => item.shop));
      setNearbyFallback(false);
      setLocationMessage(within20Km.length
        ? `Showing ${within20Km.length} barber shop(s) within 20 km, closest first.`
        : "No barber shops found within 20 km of your location.");
    } catch (err) {
      console.error("Nearby shops API error:", err);
      setError(err.message || "Unable to find nearby shops.");
      setShops([]);
      setLocationMessage("");
    } finally {
      setLoading(false);
      setLocationLoading(false);
    }
  };
  const findNearbyShops = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support location access. Search by city instead.");
      return;
    }
    setLocationLoading(true);
    setLocationMessage("Detecting your location and finding shops within 20 km…");
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;
        try {
          let detectedPlace = "Current location";
          try {
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
              { headers: { Accept: "application/json" } }
            );
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              const address = geoData.address || {};
              const area = address.suburb || address.neighbourhood || address.city_district || address.city || address.town || address.village || address.county;
              if (area) detectedPlace = `${area}${address.state ? `, ${address.state}` : ""}`;
            }
          } catch (geoError) {
            console.warn("Could not resolve location name:", geoError);
          }
          setPlaceName(detectedPlace);
          setCitySearch("");
          localStorage.setItem("snipsnap-place-name", detectedPlace);
          localStorage.setItem("snipsnap-location-coordinates", JSON.stringify({ lat, lng }));
          localStorage.removeItem("snipsnap-city-search");
          // Update the results immediately; no browser reload is needed.
          await loadNearbyAtCoordinates(lat, lng, true);
        } finally {
          setLocationLoading(false);
        }
      },
      (geoError) => {
        setLocationLoading(false);
        const message = geoError.code === 1
          ? "Location permission was denied. You can search by city instead."
          : geoError.code === 3
            ? "Location request timed out. Please try again."
            : "Unable to access your location. Check browser permissions and try again.";
        setLocationMessage(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };
  const showAllShops = () => {
    localStorage.removeItem("snipsnap-place-name");
    localStorage.removeItem("snipsnap-city-search");
    localStorage.removeItem("snipsnap-location-coordinates");
    setCitySearch("");
    setPlaceName("");
    setLocationMessage("");
    setNearbyFallback(false);
    loadShops("/shop/shops");
  };
  return (
    <div className="home-page">
      <nav className="home-navbar">
        <Link to="/" className="home-logo"><span>SnipSnap</span></Link>
        <div className="navbar-location-wrap">
          <button
            type="button"
            className="navbar-location"
            onClick={() => setLocationPickerOpen((open) => !open)}
            aria-expanded={locationPickerOpen}
            aria-label="Choose your location"
          >
            <i className="bx bx-map-pin" />
            <span className="navbar-location-text">
              <small>Your location</small>
              <strong>{placeName || "Choose location"}</strong>
            </span>
            <i className="bx bx-chevron-down location-chevron" />
          </button>
          {locationPickerOpen && (
            <div className="location-dropdown">
              <form className="location-dropdown-search" onSubmit={searchByCity}>
                <i className="bx bx-search" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(event) => setCitySearch(event.target.value)}
                  placeholder="Search city or area"
                  aria-label="Search shops by city or area"
                />
                <button type="submit" disabled={loading}>Search</button>
              </form>
              <button
                type="button"
                className="location-current-button"
                onClick={async () => {
                  setLocationPickerOpen(false);
                  await findNearbyShops();
                }}
                disabled={locationLoading}
              >
                <i className="bx bx-current-location" />
                <span>
                  <strong>{locationLoading ? "Locating..." : "Use my current location"}</strong>
                  <small>Find barber shops near you</small>
                </span>
              </button>
              {locationMessage && <p className="location-dropdown-message" role="status">{locationMessage}</p>}
            </div>
          )}
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          type="button"
        >
          <i className={menuOpen ? "bx bx-x" : "bx bx-menu"} />
        </button>
        <ul className={`home-nav-links ${menuOpen ? "show-menu" : ""}`}>
          {isLoggedIn && userRole === "client" ? (
            <>
              <li><Link to="/my-bookings" onClick={() => setMenuOpen(false)}><i className="bx bxs-calendar" /> My Bookings</Link></li>
              <li><Link to="/wallet" onClick={() => setMenuOpen(false)}><i className="bx bxs-wallet" /> Wallet</Link></li>
              <li><Link to="/profile" onClick={() => setMenuOpen(false)}><i className="bx bxs-user-circle" /> Profile</Link></li>
              <li><Link to="/logout" className="logout-link" onClick={() => setMenuOpen(false)}><i className="bx bxs-log-out" /> Logout</Link></li>
            </>
          ) : (
            <>
              <li><Link to="/" className="active-link" onClick={() => setMenuOpen(false)}>Home</Link></li>
              <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link></li>
              <li><Link to="/client/login" className="nav-login-btn" onClick={() => setMenuOpen(false)}>Login</Link></li>
            </>
          )}
        </ul>
      </nav>
      {!isLoggedIn && (
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-tag"><i className="bx bxs-sparkles" /> SMART BARBER BOOKING</div>
            <h1>Your Style.<br /><span>Your Barber.</span><br />Your Time.</h1>
            <p className="hero-description">
              Discover trusted barbers, explore their services, and book your appointment in just a few clicks.
            </p>
            <div className="hero-buttons">
              <button className="hero-primary-btn" onClick={() => navigate("/client/login")}>
                <i className="bx bxs-calendar-check" /><span>Book an Appointment</span>
              </button>
              <button className="hero-secondary-btn" onClick={() => navigate("/barber/login")}>
                <i className="bx bxs-scissors" /><span>Join as Barber</span>
              </button>
            </div>
            <div className="hero-features">
              <div className="hero-feature"><i className="bx bxs-check-circle" /><span>Easy Booking</span></div>
              <div className="hero-feature"><i className="bx bxs-check-circle" /><span>Trusted Barbers</span></div>
              <div className="hero-feature"><i className="bx bxs-check-circle" /><span>Flexible Slots</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-glow" />
            <div className="booking-card">
              <div className="booking-card-top">
                <div className="booking-icon"><i className="bx bxs-calendar" /></div>
                <span className="booking-status">Available</span>
              </div>
              <p className="small-label">NEXT APPOINTMENT</p>
              <h3>Premium Haircut</h3>
              <div className="booking-info">
                <span><i className="bx bxs-user" /> Professional Barber</span>
                <span><i className="bx bxs-time" /> 10:30 AM</span>
              </div>
              <button className="booking-action" onClick={() => navigate("/client/login")}>
                Book Now <i className="bx bx-right-arrow-alt" />
              </button>
            </div>
            <div className="floating-card floating-card-one">
              <i className="bx bxs-star" /><div><strong>4.9/5</strong><span>Customer Rating</span></div>
            </div>
            <div className="floating-card floating-card-two">
              <i className="bx bxs-map" /><div><strong>Nearby</strong><span>Barber Shops</span></div>
            </div>
          </div>
        </section>
      )}
      <section className="shops-section">
        <div className="section-heading">
          <div>
            <span className="section-label"><i className="bx bxs-store" /> EXPLORE</span>
            <h2>{nearbyFallback ? `Nearby Shops around ${placeName}` : placeName ? `Barber Shops in ${placeName}` : "Available Barber Shops"}</h2>
            <p>Find a barber shop that matches your style and book your next appointment.</p>
          </div>
          <div className="shop-count-box"><span>{openShopCount}</span><small>Shops Open</small></div>
        </div>
        <div id="barberList">
          {loading ? (
            <div className="state-container"><div className="spinner" /><h3>Finding barber shops...</h3><p>Please wait while we load available shops.</p></div>
          ) : error ? (
            <div className="state-container error-state">
              <div className="state-icon"><i className="bx bx-error-circle" /></div>
              <h3>Unable to load shops</h3>
              <p>{error}</p>
              <button type="button" className="book-btn" onClick={showAllShops}>Try Again</button>
            </div>
          ) : shops.length === 0 ? (
            <div className="state-container">
              <div className="state-icon"><i className="bx bx-store" /></div>
              <h3>No Barber Shops Found</h3>
              <p>{placeName ? `No barber shops were found within 20 km of ${placeName}. Try another location.` : "Try another city or search again after more shops have registered."}</p>
              <button type="button" className="book-btn" onClick={showAllShops}>Show All Shops</button>
            </div>
          ) : (
            <div className="barber-list-grid">
              {shops.map((shop) => {
                const isOpen = String(shop.status || "").toLowerCase() === "open";
                const coordinates = shop.coordinates?.coordinates;
                const hasCoordinates = Array.isArray(coordinates) && coordinates.length === 2;
                return (
                  <div className="barber-card" key={shop._id}>
                    <div className="shop-image-wrapper">
                      <img
                        src={shop.image || "/images/default-shop.png"}
                        alt={shop.name || "Barber shop"}
                        className="shop-image"
                        onError={(event) => { event.currentTarget.src = "/images/default-shop.png"; }}
                      />
                      <span className={`status-badge ${isOpen ? "status-open" : "status-closed"}`}>
                        <span className="status-dot" />{shop.status || "Status unavailable"}
                      </span>
                    </div>
                    <div className="barber-card-content">
                      <h3>{shop.name}</h3>
                      <p className="shop-location">
                        <i className="bx bxs-map" />
                        {shop.location || "Address unavailable"}{shop.city ? `, ${shop.city}` : ""}
                      </p>
                      {hasCoordinates && (
                        <a
                          className="shop-directions-link"
                          href={`https\://www\.google.com/maps/dir/?api=1&destination=${coordinates[1]},${coordinates[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="bx bx-navigation" /> Get Directions
                        </a>
                      )}
                      <div className="shop-details">
                        <div><i className="bx bxs-scissors" /><span>Professional Service</span></div>
                        <div><i className="bx bxs-time" /><span>{isOpen ? "Available Today" : "Currently Closed"}</span></div>
                      </div>
                      <button
                        className={`book-btn ${!isOpen ? "disabled-btn" : ""}`}
                        disabled={!isOpen}
                        onClick={() => goToShop(shop)}
                      >
                        {isOpen ? <>View Barbers <i className="bx bx-right-arrow-alt" /></> : <>Currently Closed <i className="bx bx-lock-alt" /></>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <section className="info-strip">
        <div className="info-item"><div className="info-icon"><i className="bx bxs-calendar-check" /></div><div><h4>Easy Booking</h4><p>Book your barber appointment without waiting in line.</p></div></div>
        <div className="info-item"><div className="info-icon"><i className="bx bxs-user-check" /></div><div><h4>Trusted Professionals</h4><p>Connect with professional barbers in your area.</p></div></div>
        <div className="info-item"><div className="info-icon"><i className="bx bxs-time-five" /></div><div><h4>Save Your Time</h4><p>Choose a suitable slot and manage your appointments easily.</p></div></div>
      </section>
      <footer className="home-footer">
        <div className="footer-brand">
          <Link to="/" className="footer-logo"><span className="logo-icon"><i className="bx bxs-scissors" /></span> SnipSnap</Link>
          <p>Your simple and smarter way to find and book barber appointments.</p>
        </div>
        <div className="footer-links"><Link to="/">Home</Link><Link to="/contact">Contact</Link>{!isLoggedIn && <Link to="/client/login">Login</Link>}</div>
        <div className="footer-bottom"><p>© {new Date().getFullYear()} SnipSnap. All rights reserved.</p></div>
      </footer>
    </div>
  );
};
export default Home;