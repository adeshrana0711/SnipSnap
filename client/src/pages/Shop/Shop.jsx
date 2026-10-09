import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../../styles/shop.css";
const Shop = () => {
  const navigate = useNavigate();
  const { id: shopId } = useParams();

  const [shopInfo, setShopInfo] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [isLoggedInAsClient, setIsLoggedInAsClient] = useState(false);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // CHECK CLIENT LOGIN
  // =====================================================

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch("/me", {
          credentials: "include",
        });

        const data = await res.json();

        if (data.loggedIn && data.role === "client") {
          setIsLoggedInAsClient(true);
        }
      } catch (err) {
        console.log("User check error", err);
      }
    };

    checkUser();
  }, []);

  // =====================================================
  // LOAD SHOP
  // =====================================================

  useEffect(() => {
    if (!shopId) return;

    const loadShop = async () => {
      try {
        setLoading(true);

        const res = await fetch(`/shop/${shopId}/data`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Unable to load shop");
        }

        const data = await res.json();

        setShopInfo(data.shop);

        const barbersWithStatus = data.barbers.map((barber) => {
          const now = new Date();

          const current =
            now.getHours() * 60 + now.getMinutes();

          const hasWorkingHours =
            barber.workingHours &&
            barber.workingHours.start &&
            barber.workingHours.end;

          const [sh, sm] = hasWorkingHours
            ? barber.workingHours.start
                .split(":")
                .map(Number)
            : [0, 0];

          const [eh, em] = hasWorkingHours
            ? barber.workingHours.end
                .split(":")
                .map(Number)
            : [0, 0];

          const start = hasWorkingHours
            ? sh * 60 + sm
            : 0;

          const end = hasWorkingHours
            ? eh * 60 + em
            : 0;

          const isWithinHours =
            hasWorkingHours &&
            current >= start &&
            current <= end;

          const status =
            barber.status === "Active" &&
            isWithinHours
              ? "Active"
              : "Inactive";

          return {
            ...barber,
            status,
          };
        });

        setBarbers(barbersWithStatus);
      } catch (err) {
        console.error("Error loading shop:", err);
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [shopId]);

  // =====================================================
  // BOOK APPOINTMENT
  // =====================================================

  const handleBookAppointment = (barberId) => {
    if (!isLoggedInAsClient) {
      navigate(
        `/client/login?next=/shop/${shopId}`
      );

      return;
    }

    navigate(`/appointment/${barberId}`);
  };

  // =====================================================
  // BARBER COUNTS
  // =====================================================

  const activeBarbers = barbers.filter(
    (barber) => barber.status === "Active"
  ).length;

  const inactiveBarbers = barbers.filter(
    (barber) => barber.status === "Inactive"
  ).length;

  const hasAvailableBarber = activeBarbers > 0;

  return (
    <div className="shop-page">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="shop-navbar">

        <Link to="/" className="shop-logo">

          <span className="logo-mark">
            <i className="bx bxs-scissors"></i>
          </span>

          <span>SnipSnap</span>

        </Link>


        <ul className="shop-nav-links">

          {isLoggedInAsClient ? (
            <>
              <li>
                <Link to="/my-bookings">
                  <i className="bx bxs-calendar"></i>
                  My Bookings
                </Link>
              </li>

              <li>
                <Link to="/wallet">
                  <i className="bx bxs-wallet"></i>
                  Wallet
                </Link>
              </li>

              <li>
                <Link to="/profile">
                  <i className="bx bxs-user-circle"></i>
                  Profile
                </Link>
              </li>

              <li>
                <Link to="/logout">
                  <i className="bx bxs-log-out"></i>
                  Logout
                </Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/">
                  Home
                </Link>
              </li>

              <li>
                <Link to="/contact">
                  Contact
                </Link>
              </li>

              <li>
                <Link
                  to="/client/login"
                  className="nav-login-btn"
                >
                  Login
                </Link>
              </li>
            </>
          )}

        </ul>

      </nav>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="shop-main">

        {/* =================================================
            SHOP HERO
        ================================================= */}

        {shopInfo && (
          <section className="shop-hero">

            <div className="shop-hero-content">

              <div className="shop-header-icon">
                <i className="bx bxs-store"></i>
              </div>

              <div className="shop-header-text">

                <span className="shop-label">
                  SnipSnap BARBER SHOP
                </span>

                <h1>
                  {shopInfo.name}
                </h1>

                <p className="shop-location">
                  <i className="bx bxs-map"></i>
                  {shopInfo.location}
                </p>

                <div className="shop-open-status">

                  <span className="open-dot"></span>

                  {hasAvailableBarber
                    ? "Barbers Available Now"
                    : "No Barbers Available Right Now"}

                </div>

              </div>

            </div>


            {/* HERO STATS */}

            <div className="shop-header-stats">

              <div className="shop-stat">

                <div className="stat-icon">
                  <i className="bx bxs-user"></i>
                </div>

                <div>
                  <strong>
                    {barbers.length}
                  </strong>

                  <span>
                    Total Barbers
                  </span>
                </div>

              </div>


              <div className="shop-stat active-stat">

                <div className="stat-icon">
                  <i className="bx bxs-check-circle"></i>
                </div>

                <div>
                  <strong>
                    {activeBarbers}
                  </strong>

                  <span>
                    Available Now
                  </span>
                </div>

              </div>

            </div>

          </section>
        )}


        {/* =================================================
            QUICK INFORMATION
        ================================================= */}

        <section className="shop-info-grid">

          <div className="shop-info-card">

            <div className="info-card-icon blue">
              <i className="bx bxs-calendar-check"></i>
            </div>

            <div>
              <h3>
                Easy Booking
              </h3>

              <p>
                Select an available barber and
                book your appointment online.
              </p>
            </div>

          </div>


          <div className="shop-info-card">

            <div className="info-card-icon green">
              <i className="bx bxs-user-check"></i>
            </div>

            <div>
              <h3>
                Professional Barbers
              </h3>

              <p>
                Choose from the barbers currently
                available at this shop.
              </p>
            </div>

          </div>


          <div className="shop-info-card">

            <div className="info-card-icon purple">
              <i className="bx bxs-time-five"></i>
            </div>

            <div>
              <h3>
                Flexible Hours
              </h3>

              <p>
                Check each barber's working hours
                before making your booking.
              </p>
            </div>

          </div>

        </section>


        {/* =================================================
            BARBER SECTION
        ================================================= */}

        <section className="barber-section">

          <div className="section-top">

            <div>

              <span className="section-label">
                <i className="bx bxs-scissors"></i>
                OUR TEAM
              </span>

              <h2>
                Choose Your Barber
              </h2>

              <p>
                Select an available barber to continue
                with your appointment.
              </p>

            </div>


            <div className="availability-count">

              <strong>
                {activeBarbers}
              </strong>

              <span>
                Available Now
              </span>

            </div>

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <div className="shop-loading">

              <div className="shop-spinner"></div>

              <h3>
                Finding available barbers
              </h3>

              <p>
                Please wait while we load the shop.
              </p>

            </div>

          ) : barbers.length === 0 ? (

            /* =================================================
               EMPTY
            ================================================= */

            <div className="shop-empty">

              <div className="empty-icon">
                <i className="bx bxs-user-x"></i>
              </div>

              <h3>
                No Barbers Available
              </h3>

              <p>
                This shop has not added any barbers yet.
              </p>

              <Link
                to="/"
                className="back-home-btn"
              >
                <i className="bx bx-arrow-back"></i>
                Explore Other Shops
              </Link>

            </div>

          ) : (

            /* =================================================
               BARBER GRID
            ================================================= */

            <div className="shop-barber-grid">

              {barbers.map((barber) => (

                <article
                  className="shop-barber-card"
                  key={barber._id}
                >

                  {/* CARD TOP */}

                  <div className="barber-card-top">

                    <div className="barber-avatar">

                      <i className="bx bxs-user"></i>

                    </div>


                    <span
                      className={`barber-status ${
                        barber.status === "Active"
                          ? "active"
                          : "inactive"
                      }`}
                    >

                      <span className="status-dot"></span>

                      {barber.status}

                    </span>

                  </div>


                  {/* BARBER NAME */}

                  <div className="barber-details">

                    <h3>
                      {barber.name}
                    </h3>

                    <p className="barber-skill">

                      <i className="bx bxs-scissors"></i>

                      {barber.skills ||
                        "Haircut Specialist"}

                    </p>

                  </div>


                  {/* WORKING HOURS */}

                  <div className="barber-hours">

                    <div>

                      <i className="bx bx-time-five"></i>

                      <span>
                        Working Hours
                      </span>

                    </div>

                    <strong>

                      {barber.workingHours?.start &&
                      barber.workingHours?.end
                        ? `${barber.workingHours.start} - ${barber.workingHours.end}`
                        : "Not specified"}

                    </strong>

                  </div>


                  {/* AVAILABILITY MESSAGE */}

                  <div
                    className={`availability-message ${
                      barber.status === "Active"
                        ? "available"
                        : "unavailable"
                    }`}
                  >

                    <i
                      className={
                        barber.status === "Active"
                          ? "bx bxs-check-circle"
                          : "bx bxs-time-five"
                      }
                    ></i>

                    {barber.status === "Active"
                      ? "Available for booking"
                      : "Currently unavailable"}

                  </div>


                  {/* BOOK */}

                  <button
                    className={`shop-book-btn ${
                      barber.status === "Inactive"
                        ? "disabled"
                        : ""
                    }`}
                    disabled={
                      barber.status === "Inactive"
                    }
                    onClick={() =>
                      handleBookAppointment(
                        barber._id
                      )
                    }
                  >

                    <i className="bx bxs-calendar"></i>

                    {barber.status === "Active"
                      ? "Book Appointment"
                      : "Currently Unavailable"}

                    {barber.status === "Active" && (
                      <i className="bx bx-right-arrow-alt arrow-icon"></i>
                    )}

                  </button>

                </article>

              ))}

            </div>

          )}

        </section>


        {/* =================================================
            BOOKING GUIDE
        ================================================= */}

        <section className="booking-guide">

          <div className="guide-heading">

            <span className="section-label">
              <i className="bx bxs-bulb"></i>
              SIMPLE PROCESS
            </span>

            <h2>
              How Booking Works
            </h2>

            <p>
              Getting your next haircut appointment
              takes only a few simple steps.
            </p>

          </div>


          <div className="guide-steps">

            <div className="guide-step">

              <span className="step-number">
                01
              </span>

              <div className="step-icon">
                <i className="bx bxs-user"></i>
              </div>

              <h3>
                Choose a Barber
              </h3>

              <p>
                Pick a barber who is currently
                available.
              </p>

            </div>


            <div className="guide-line"></div>


            <div className="guide-step">

              <span className="step-number">
                02
              </span>

              <div className="step-icon">
                <i className="bx bxs-calendar"></i>
              </div>

              <h3>
                Select a Slot
              </h3>

              <p>
                Choose a suitable date and
                appointment time.
              </p>

            </div>


            <div className="guide-line"></div>


            <div className="guide-step">

              <span className="step-number">
                03
              </span>

              <div className="step-icon">
                <i className="bx bxs-check-circle"></i>
              </div>

              <h3>
                Confirm Booking
              </h3>

              <p>
                Confirm your appointment and
                you're ready to go.
              </p>

            </div>

          </div>

        </section>


        {/* =================================================
            LOGIN CTA
        ================================================= */}

        {!isLoggedInAsClient && hasAvailableBarber && (

          <section className="shop-login-cta">

            <div className="cta-icon">
              <i className="bx bxs-calendar-check"></i>
            </div>

            <div className="cta-content">

              <h2>
                Ready for your next haircut?
              </h2>

              <p>
                Login to your SnipSnap account and
                book an available barber.
              </p>

            </div>

            <button
              className="cta-button"
              onClick={() =>
                navigate(
                  `/client/login?next=/shop/${shopId}`
                )
              }
            >
              Login & Book

              <i className="bx bx-right-arrow-alt"></i>
            </button>

          </section>

        )}

      </main>


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="shop-footer">

        <div className="footer-logo">

          <i className="bx bxs-scissors"></i>

          SnipSnap

        </div>

        <p>
          Find your barber. Book your time. Look your best.
        </p>

        <span>
          © {new Date().getFullYear()} SnipSnap.
          All rights reserved.
        </span>

      </footer>

    </div>
  );
};

export default Shop;