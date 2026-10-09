import React, { useEffect, useState } from "react";
import "../../styles/home.css";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch("/me", {
          credentials: "include",
        });

        const data = await res.json();

        if (data.loggedIn && data.role === "client") {
          setIsLoggedIn(true);
          setUserRole(data.role);
        }
      } catch (error) {
        console.error("Error checking user:", error);
      }
    };

    const fetchShops = async () => {
      try {
        setLoading(true);

        const res = await fetch("/shop/shops", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch shops");
        }

        const data = await res.json();

        setShops(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load barber shops. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    checkUser();
    fetchShops();
  }, []);

  const openShopCount = shops.filter(
    (shop) => shop.status === "Open"
  ).length;

  const goToShop = (shop) => {
    if (shop.status === "Open") {
      navigate(`/shop/${shop._id}`);
    }
  };

  return (
    <div className="home-page">

          <nav className="home-navbar">

        <Link to="/" className="home-logo">
          <span>SnipSnap</span>
        </Link>

        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <i className={menuOpen? "bx bx-x": "bx bx-menu"}></i>
        </button>

        <ul className={`home-nav-links ${menuOpen ? "show-menu" : ""}`}>

          {isLoggedIn && userRole === "client" ? (
            <>
              <li>
                <Link
                  to="/my-bookings"
                  onClick={() => setMenuOpen(false)}
                >
                  <i className="bx bxs-calendar"></i>
                  My Bookings
                </Link>
              </li>

              <li>
                <Link
                  to="/wallet"
                  onClick={() => setMenuOpen(false)}
                >
                  <i className="bx bxs-wallet"></i>
                  Wallet
                </Link>
              </li>

              <li>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                >
                  <i className="bx bxs-user-circle"></i>
                  Profile
                </Link>
              </li>

              <li>
                <Link
                  to="/logout"
                  onClick={() => setMenuOpen(false)}
                  className="logout-link"
                >
                  <i className="bx bxs-log-out"></i>
                  Logout
                </Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="active-link"
                >
                  Home
                </Link>
              </li>

              <li>
                <Link
                  to="/contact"
                  onClick={() => setMenuOpen(false)}
                >
                  Contact
                </Link>
              </li>

              <li>
                <Link
                  to="/client/login"
                  className="nav-login-btn"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
              </li>
            </>
          )}

        </ul>
      </nav>


      {!isLoggedIn && (
        <section className="hero-section">

          {/* LEFT SIDE */}

          <div className="hero-content">

            <div className="hero-tag">
              <i className="bx bxs-sparkles"></i>
              SMART BARBER BOOKING
            </div>

            <h1>
              Your Style.
              <br />

              <span>Your Barber.</span>

              <br />

              Your Time.
            </h1>

            <p className="hero-description">
              Discover trusted barbers, explore their services,
              and book your appointment in just a few clicks.
            </p>


            {/* BUTTONS */}

            <div className="hero-buttons">

              <button
                className="hero-primary-btn"
                onClick={() =>
                  navigate("/client/login")
                }
              >
                <i className="bx bxs-calendar-check"></i>

                <span>
                  Book an Appointment
                </span>
              </button>


              <button
                className="hero-secondary-btn"
                onClick={() =>
                  navigate("/barber/login")
                }
              >
                <i className="bx bxs-scissors"></i>

                <span>
                  Join as Barber
                </span>
              </button>

            </div>


            {/* FEATURES */}

            <div className="hero-features">

              <div className="hero-feature">
                <i className="bx bxs-check-circle"></i>
                <span>Easy Booking</span>
              </div>

              <div className="hero-feature">
                <i className="bx bxs-check-circle"></i>
                <span>Trusted Barbers</span>
              </div>

              <div className="hero-feature">
                <i className="bx bxs-check-circle"></i>
                <span>Flexible Slots</span>
              </div>

            </div>

          </div>


          {/* RIGHT SIDE */}

          <div className="hero-visual">

            <div className="hero-glow"></div>


            {/* BOOKING CARD */}

            <div className="booking-card">

              <div className="booking-card-top">

                <div className="booking-icon">
                  <i className="bx bxs-calendar"></i>
                </div>

                <span className="booking-status">
                  Available
                </span>

              </div>


              <p className="small-label">
                NEXT APPOINTMENT
              </p>


              <h3>
                Premium Haircut
              </h3>


              <div className="booking-info">

                <span>
                  <i className="bx bxs-user"></i>
                  Professional Barber
                </span>

                <span>
                  <i className="bx bxs-time"></i>
                  10:30 AM
                </span>

              </div>


              <button
                onClick={() =>
                  navigate("/client/login")
                }
                className="booking-action"
              >
                Book Now

                <i className="bx bx-right-arrow-alt"></i>
              </button>

            </div>


            {/* RATING CARD */}

            <div className="floating-card floating-card-one">

              <i className="bx bxs-star"></i>

              <div>
                <strong>4.9/5</strong>

                <span>
                  Customer Rating
                </span>
              </div>

            </div>


            {/* NEARBY CARD */}

            <div className="floating-card floating-card-two">

              <i className="bx bxs-map"></i>

              <div>
                <strong>Nearby</strong>

                <span>
                  Barber Shops
                </span>
              </div>

            </div>

          </div>

        </section>
      )}


      {/* =================================================
          SHOP SECTION
      ================================================= */}

      <section className="shops-section">

        <div className="section-heading">

          <div>

            <span className="section-label">
              <i className="bx bxs-store"></i>
              EXPLORE
            </span>

            <h2>
              Available Barber Shops
            </h2>

            <p>
              Find a barber shop that matches your style
              and book your next appointment.
            </p>

          </div>


          <div className="shop-count-box">

            <span>
              {openShopCount}
            </span>

            <small>
              Shops Open
            </small>

          </div>

        </div>


        {/* SHOP LIST */}

        <div id="barberList">

          {/* LOADING */}

          {loading ? (

            <div className="state-container">

              <div className="spinner"></div>

              <h3>
                Finding barber shops...
              </h3>

              <p>
                Please wait while we load
                available shops.
              </p>

            </div>


          ) : error ? (

            /* ERROR */

            <div className="state-container error-state">

              <div className="state-icon">
                <i className="bx bx-error-circle"></i>
              </div>

              <h3>
                Something went wrong
              </h3>

              <p>
                {error}
              </p>

            </div>


          ) : shops.length === 0 ? (

            /* EMPTY */

            <div className="state-container">

              <div className="state-icon">
                <i className="bx bx-store"></i>
              </div>

              <h3>
                No Barber Shops Available
              </h3>

              <p>
                There are currently no registered
                barber shops available.
              </p>

            </div>


          ) : (

            /* SHOPS */

            shops.map((shop) => {

              const isOpen =
                shop.status === "Open";

              return (

                <div
                  className="barber-card"
                  key={shop._id}
                >

                  {/* IMAGE */}

                  <div className="shop-image-wrapper">

                    <img
                      src={
                        shop.image ||
                        "/images/default-shop.png"
                      }
                      alt={shop.name}
                      className="shop-image"
                      onError={(e) => {
                        e.currentTarget.src =
                          "/images/default-shop.png";
                      }}
                    />


                    <span
                      className={`status-badge ${
                        isOpen
                          ? "status-open"
                          : "status-closed"
                      }`}
                    >

                      <span className="status-dot"></span>

                      {shop.status}

                    </span>

                  </div>


                  {/* CARD CONTENT */}

                  <div className="barber-card-content">

                    <h3>
                      {shop.name}
                    </h3>


                    <p className="shop-location">

                      <i className="bx bxs-map"></i>

                      {shop.location ||
                        "Location unavailable"}

                    </p>


                    <div className="shop-details">

                      <div>

                        <i className="bx bxs-scissors"></i>

                        <span>
                          Professional Service
                        </span>

                      </div>


                      <div>

                        <i className="bx bxs-time"></i>

                        <span>
                          {isOpen
                            ? "Available Today"
                            : "Currently Closed"}
                        </span>

                      </div>

                    </div>


                    <button
                      className={`book-btn ${
                        !isOpen
                          ? "disabled-btn"
                          : ""
                      }`}
                      disabled={!isOpen}
                      onClick={() =>
                        goToShop(shop)
                      }
                    >

                      {isOpen ? (
                        <>
                          View Barbers

                          <i className="bx bx-right-arrow-alt"></i>
                        </>
                      ) : (
                        <>
                          Currently Closed

                          <i className="bx bx-lock-alt"></i>
                        </>
                      )}

                    </button>

                  </div>

                </div>
              );
            })
          )}

        </div>

      </section>


      {/* =================================================
          INFO STRIP
      ================================================= */}

      <section className="info-strip">

        <div className="info-item">

          <div className="info-icon">
            <i className="bx bxs-calendar-check"></i>
          </div>

          <div>

            <h4>
              Easy Booking
            </h4>

            <p>
              Book your barber appointment
              without waiting in line.
            </p>

          </div>

        </div>


        <div className="info-item">

          <div className="info-icon">
            <i className="bx bxs-user-check"></i>
          </div>

          <div>

            <h4>
              Trusted Professionals
            </h4>

            <p>
              Connect with professional
              barbers in your area.
            </p>

          </div>

        </div>


        <div className="info-item">

          <div className="info-icon">
            <i className="bx bxs-time-five"></i>
          </div>

          <div>

            <h4>
              Save Your Time
            </h4>

            <p>
              Choose a suitable slot and
              manage your appointments easily.
            </p>

          </div>

        </div>

      </section>


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="home-footer">

        <div className="footer-brand">

          <Link
            to="/"
            className="footer-logo"
          >

            <span className="logo-icon">
              <i className="bx bxs-scissors"></i>
            </span>'
            SnipSnap
          </Link>


          <p>
            Your simple and smarter way to
            find and book barber appointments.
          </p>

        </div>


        <div className="footer-links">

          <Link to="/">
            Home
          </Link>

          <Link to="/contact">
            Contact
          </Link>

          {!isLoggedIn && (
            <Link to="/client/login">
              Login
            </Link>
          )}

        </div>


        <div className="footer-bottom">

          <p>
            © {new Date().getFullYear()} SnipSnap.
            All rights reserved.
          </p>

        </div>

      </footer>

    </div>
  );
};

export default Home;