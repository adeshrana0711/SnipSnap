import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const MyBookings = () => {
  const [bookingsData, setBookingsData] = useState([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState(0);
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [filteredBookings, setFilteredBookings] = useState([]);

  const loadBookings = async () => {
    try {
      console.log("Fetching bookings...");

      const res = await fetch("/client/bookings");
      const text = await res.text();
      console.log("Raw response:", text);

      let bookings;
      try {
        bookings = JSON.parse(text);
      } catch (e) {
        console.error("JSON parse error:", e);
        setLoading(false);
        return;
      }

      setBookingsData(bookings);
      setLoading(false);

      // Calculate total bookings
      setTotalBookings(bookings.length);

      // Calculate pending bookings
      const pending = bookings.filter((b) => b.status === "Pending").length;
      setPendingBookings(pending);

      // Calculate upcoming bookings
      const now = new Date();
      const upcoming = bookings.filter((b) => {
        const d = new Date(b.date);
        const [h, m] = b.time.split(":");
        d.setHours(h, m);
        return d > now;
      }).length;

      setUpcomingBookings(upcoming);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();

    // Set up interval to reload bookings every 3 seconds
    const interval = setInterval(loadBookings, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Filter bookings by date whenever dateFilter or bookingsData changes
    const filtered = bookingsData.filter((b) =>
      b.date.startsWith(dateFilter)
    );
    setFilteredBookings(filtered);
  }, [dateFilter, bookingsData]);

  return (
    <div>
      <nav>
        <div className="logo">SnipSnap</div>
        <ul className="links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/profile">Profile</Link>
          </li>
          <li>
            <Link to="/logout">Logout</Link>
          </li>
        </ul>
      </nav>

      <div className="container">
        <h2>My Bookings</h2>

        <div className="stats">
          <div className="stat-card">
            <h2>{totalBookings}</h2>
            <p>Total</p>
          </div>
          <div className="stat-card">
            <h2>{pendingBookings}</h2>
            <p>Pending</p>
          </div>
          <div className="stat-card">
            <h2>{upcomingBookings}</h2>
            <p>Upcoming</p>
          </div>
        </div>

        <div className="filter">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>Shop</th>
              <th>Barber</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="no-data">
                  Loading...
                </td>
              </tr>
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  No bookings
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking, index) => (
                <tr key={index}>
                  <td>{booking.shopName}</td>
                  <td>{booking.barberName}</td>
                  <td>{booking.date.split("T")[0]}</td>
                  <td>{booking.time}</td>
                  <td>{booking.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyBookings;
