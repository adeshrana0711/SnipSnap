import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/shopDashboard.css";

const ShopDashboard = () => {
  const navigate = useNavigate();

  // ================= UI STATE =================
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ================= SHOP DATA =================
  const [shopProfile, setShopProfile] = useState({
    name: "Shop",
    image: "/images/default-shop.png",
  });

  const [barbers, setBarbers] = useState([]);
  const [orders, setOrders] = useState([]);

  // ================= FORM =================
  const [formData, setFormData] = useState({
    bName: "",
    bLocation: "",
    bStatus: "Active",
    bSkills: "",
  });

  // ================= AVAILABILITY =================
  const [shopStart, setShopStart] = useState("");
  const [shopEnd, setShopEnd] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // ================= STATS =================
  const [totalBookings, setTotalBookings] = useState(0);
  const [todayBookings, setTodayBookings] = useState(0);
  const [availableSlots, setAvailableSlots] = useState(0);

  // ================= FILTERS =================
  const [orderFilter, setOrderFilter] = useState("today");
  const [barberFilter, setBarberFilter] = useState("active");

  // ================= TOAST =================
  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 50);

    setTimeout(() => {
      toast.classList.remove("show");

      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // ================= NAVIGATION =================

  const changeSection = (section) => {
    setCurrentSection(section);

    // Close sidebar on small screens
    if (window.innerWidth <= 800) {
      setSidebarOpen(false);
    }
  };

  // ================= SHOP PROFILE =================

  const loadShopProfile = async () => {
    try {
      const res = await fetch("/shop/profile", {
        credentials: "include",
      });

      if (!res.ok) return;

      const shop = await res.json();

      setShopProfile({
        name: shop.name || "Shop",
        image: shop.image || "/images/default-shop.png",
      });
    } catch (err) {
      console.error("Profile load error", err);
    }
  };

  // ================= BARBERS =================

  const loadBarbers = async () => {
    try {
      const res = await fetch("/api/barbers/all", {
        credentials: "include",
      });

      if (!res.ok) {
        showToast("Please login as a shop again", "error");
        return;
      }

      const data = await res.json();

      setBarbers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading barbers:", err);
      showToast("Error loading barbers", "error");
    }
  };

  const addBarber = async () => {
    if (
      !formData.bName.trim() ||
      !formData.bLocation.trim() ||
      !formData.bSkills.trim()
    ) {
      showToast("Please fill all fields", "error");
      return;
    }

    try {
      const res = await fetch("/api/barbers/add", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.bName,
          location: formData.bLocation,
          skills: formData.bSkills,
          status: formData.bStatus,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      const data = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) {
        showToast(
          data.message || data.error || "Unable to add barber",
          "error"
        );
        return;
      }

      closeModal();

      setFormData({
        bName: "",
        bLocation: "",
        bStatus: "Active",
        bSkills: "",
      });

      showToast("Barber added successfully");

      await loadBarbers();
    } catch (err) {
      console.error("Error adding barber:", err);
      showToast("Please login as a shop again", "error");
    }
  };

  const toggleStatus = async (barberId) => {
    try {
      const res = await fetch(`/api/barbers/status/${barberId}`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        showToast(
          data.message || "Unable to update barber status",
          "error"
        );

        return;
      }

      const updatedBarber = await res.json();

      setBarbers((prev) =>
        prev.map((barber) =>
          barber._id === barberId ? updatedBarber : barber
        )
      );

      showToast("Barber status updated");
    } catch (err) {
      console.error("Error toggling status:", err);

      showToast("Error updating barber status", "error");
    }
  };

  const deleteBarber = async (barberId) => {
    if (!window.confirm("Remove this barber?")) return;

    try {
      const res = await fetch(`/api/barbers/${barberId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        showToast("Unable to remove barber", "error");
        return;
      }

      await loadBarbers();

      showToast("Barber removed");
    } catch (err) {
      console.error("Error deleting barber:", err);

      showToast("Error deleting barber", "error");
    }
  };

  // ================= ORDERS =================

  const loadOrders = async () => {
    try {
      const res = await fetch("/appointment/shop/orders", {
        credentials: "include",
      });

      if (!res.ok) return;

      const data = await res.json();

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Order load error", err);
    }
  };

  const updateStatus = async (orderId, status) => {
    if (!window.confirm(`Mark appointment as ${status}?`)) {
      return;
    }

    try {
      const res = await fetch(`/appointment/update-status/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      if (!res.ok) {
        showToast("Update failed", "error");
        return;
      }

      showToast("Appointment updated");

      await loadOrders();
      await loadBookingStats();
    } catch (err) {
      console.error(err);

      showToast("Server error", "error");
    }
  };

  // ================= SHOP AVAILABILITY =================

  const loadShopHours = () => {
    const start = localStorage.getItem("shopStart");
    const end = localStorage.getItem("shopEnd");

    if (start) setShopStart(start);
    if (end) setShopEnd(end);
  };

  const saveShopAvailability = async () => {
    if (!shopStart || !shopEnd) {
      showToast("Please select opening and closing time", "error");
      return;
    }

    try {
      const res = await fetch("/shop/availability", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          openTime: shopStart,
          closeTime: shopEnd,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Unable to save hours", "error");
        return;
      }

      localStorage.setItem("shopStart", shopStart);
      localStorage.setItem("shopEnd", shopEnd);

      await loadBookingStats();

      showToast("Shop hours updated");
    } catch (err) {
      console.error("Error saving shop availability:", err);

      showToast("Unable to save shop hours", "error");
    }
  };

  // ================= BARBER AVAILABILITY =================

  const saveAvailability = async () => {
    if (!selectedBarberId) {
      showToast("Please select a barber", "error");
      return;
    }

    if (!startTime || !endTime) {
      showToast("Select working hours", "error");
      return;
    }

    try {
      const res = await fetch(
        `/api/barbers/availability/${selectedBarberId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: startTime,
            end: endTime,
          }),
        }
      );

      if (!res.ok) {
        showToast("Unable to update availability", "error");
        return;
      }

      await res.json();

      localStorage.setItem(
        "barberStart_" + selectedBarberId,
        startTime
      );

      localStorage.setItem(
        "barberEnd_" + selectedBarberId,
        endTime
      );

      showToast("Barber availability updated");
    } catch (err) {
      console.error("Error saving availability:", err);

      showToast("Error saving availability", "error");
    }
  };

  // ================= STATS =================

  const loadBookingStats = async () => {
    try {
      const res = await fetch("/appointment/shop/orders", {
        credentials: "include",
      });

      if (!res.ok) return;

      const ordersData = await res.json();

      setTotalBookings(ordersData.length);

      const today = new Date().toISOString().split("T")[0];

      const todayOrders = ordersData.filter((order) => {
        const orderDate = new Date(order.date)
          .toISOString()
          .split("T")[0];

        return orderDate === today;
      });

      setTodayBookings(todayOrders.length);

      const storedStart =
        shopStart || localStorage.getItem("shopStart");

      const storedEnd =
        shopEnd || localStorage.getItem("shopEnd");

      if (storedStart && storedEnd) {
        const [startH, startM] = storedStart
          .split(":")
          .map(Number);

        const [endH, endM] = storedEnd
          .split(":")
          .map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const totalSlots =
          (endMinutes - startMinutes) / 30;

        const slots =
          totalSlots - todayOrders.length;

        setAvailableSlots(Math.max(0, slots));
      } else {
        setAvailableSlots(0);
      }
    } catch (err) {
      console.error("Stats load error:", err);
    }
  };

  // ================= FILTERED DATA =================

  const filteredOrders = useMemo(() => {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    switch (orderFilter) {
      case "today":
        return orders.filter(
          (order) =>
            new Date(order.date)
              .toISOString()
              .split("T")[0] === today
        );

      case "pending":
        return orders.filter(
          (order) => order.status === "Booked"
        );

      case "completed":
        return orders.filter(
          (order) => order.status === "Completed"
        );

      case "cancelled":
        return orders.filter(
          (order) => order.status === "Cancelled"
        );

      default:
        return orders;
    }
  }, [orders, orderFilter]);

  const filteredBarbers = useMemo(() => {
    switch (barberFilter) {
      case "active":
        return barbers.filter(
          (barber) => barber.status === "Active"
        );

      case "inactive":
        return barbers.filter(
          (barber) => barber.status === "Inactive"
        );

      default:
        return barbers;
    }
  }, [barbers, barberFilter]);

  // ================= HELPERS =================

  const closeModal = () => {
    setShowModal(false);
  };

  const formatTime = (time) => {
    if (!time) return "--";

    const [h, m] = time.split(":").map(Number);

    let eh = h;
    let em = m + 30;

    if (em >= 60) {
      eh++;
      em -= 60;
    }

    return `${time} - ${eh
      .toString()
      .padStart(2, "0")}:${em
      .toString()
      .padStart(2, "0")}`;
  };

  const formatDate = (date) => {
    if (!date) return "--";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitial = (name) => {
    if (!name) return "S";

    return name.charAt(0).toUpperCase();
  };

  const activeBarbers = barbers.filter(
    (barber) => barber.status === "Active"
  ).length;

  const inactiveBarbers = barbers.filter(
    (barber) => barber.status === "Inactive"
  ).length;

  // ================= LOAD DASHBOARD =================

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const res = await fetch("/me", {
          credentials: "include",
        });

        const user = await res.json();

        if (!user.loggedIn || user.role !== "shop") {
          navigate("/", {
            replace: true,
          });

          return;
        }
      } catch (err) {
        console.error("Session check error:", err);

        navigate("/", {
          replace: true,
        });

        return;
      }

      setCheckingSession(false);

      await Promise.all([
        loadBarbers(),
        loadShopProfile(),
        loadOrders(),
        loadBookingStats(),
      ]);

      loadShopHours();
    };

    queueMicrotask(loadDashboardData);
  }, [navigate]);

  useEffect(() => {
    if (shopStart && shopEnd) {
      loadBookingStats();
    }
  }, [shopStart, shopEnd]);

  // ================= LOADING =================

  if (checkingSession) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your workspace...</p>
      </div>
    );
  }

  // ================= UI =================

  return (
    <div
      className={`dashboard-container ${
        sidebarOpen ? "sidebar-open" : "sidebar-closed"
      }`}
    >
      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✂</div>

          <div>
            <h2>SnipSnap</h2>
            <span>Shop Manager</span>
          </div>
        </div>

        <div className="profile">
          <div className="profile-image-wrapper">
            <img
              src={shopProfile.image}
              alt="Shop"
              onError={(e) => {
                e.currentTarget.src =
                  "/images/default-shop.png";
              }}
            />

            <span className="online-dot"></span>
          </div>

          <div className="profile-info">
            <h3>{shopProfile.name}</h3>
            <span>Shop Owner</span>
          </div>
        </div>

        <div className="menu-label">
          MAIN MENU
        </div>

        <ul className="menu">
          <li>
            <button
              className={
                currentSection === "dashboard"
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
              onClick={() =>
                changeSection("dashboard")
              }
            >
              <span className="menu-icon">⌂</span>
              <span>Dashboard</span>
            </button>
          </li>

          <li>
            <button
              className={
                currentSection === "orders"
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
              onClick={() =>
                changeSection("orders")
              }
            >
              <span className="menu-icon">◫</span>
              <span>Appointments</span>

              {todayBookings > 0 && (
                <span className="menu-badge">
                  {todayBookings}
                </span>
              )}
            </button>
          </li>

          <li>
            <button
              className={
                currentSection === "availability"
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
              onClick={() =>
                changeSection("availability")
              }
            >
              <span className="menu-icon">◷</span>
              <span>Availability</span>
            </button>
          </li>

          <li>
            <button
              className={
                currentSection === "profile"
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
              onClick={() =>
                changeSection("profile")
              }
            >
              <span className="menu-icon">⚙</span>
              <span>Shop Profile</span>
            </button>
          </li>
        </ul>

        <div className="sidebar-bottom">
          <Link
            to="/logout"
            className="sidebar-link logout-link"
          >
            <span className="menu-icon">↪</span>
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      {/* ================= MAIN ================= */}

      <main className="main">
        {/* TOP BAR */}

        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
            >
              ☰
            </button>

            <div>
              <p className="breadcrumb">
                SnipSnap / {currentSection}
              </p>

              <h1>
                {currentSection === "dashboard" &&
                  "Dashboard"}

                {currentSection === "orders" &&
                  "Appointments"}

                {currentSection === "availability" &&
                  "Availability"}

                {currentSection === "profile" &&
                  "Shop Profile"}
              </h1>
            </div>
          </div>

          <div className="topbar-right">
            <div className="today-date">
              <span>Today</span>
              <strong>
                {new Date().toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}
              </strong>
            </div>

            <div className="top-avatar">
              {getInitial(shopProfile.name)}
            </div>
          </div>
        </header>

        {/* ================= DASHBOARD ================= */}

        {currentSection === "dashboard" && (
          <section className="section active">
            {/* WELCOME */}

            <div className="welcome-card">
              <div>
                <span className="welcome-tag">
                  SHOP OVERVIEW
                </span>

                <h2>
                  Good day, {shopProfile.name} 👋
                </h2>

                <p>
                  Here's what's happening at your
                  shop today.
                </p>
              </div>

              <div className="welcome-decoration">
                ✂
              </div>
            </div>

            {/* STAT CARDS */}

            <div className="stats">
              <div className="stat-box blue">
                <div className="stat-top">
                  <div className="stat-icon">
                    ◫
                  </div>

                  <span className="stat-label">
                    ALL TIME
                  </span>
                </div>

                <h3>{totalBookings}</h3>

                <p>Total Appointments</p>

                <div className="stat-line"></div>
              </div>

              <div className="stat-box purple">
                <div className="stat-top">
                  <div className="stat-icon">
                    ◷
                  </div>

                  <span className="stat-label">
                    TODAY
                  </span>
                </div>

                <h3>{todayBookings}</h3>

                <p>Today's Appointments</p>

                <div className="stat-line"></div>
              </div>

              <div className="stat-box green">
                <div className="stat-top">
                  <div className="stat-icon">
                    ✓
                  </div>

                  <span className="stat-label">
                    AVAILABLE
                  </span>
                </div>

                <h3>{availableSlots}</h3>

                <p>Available Slots</p>

                <div className="stat-line"></div>
              </div>

              <div className="stat-box orange">
                <div className="stat-top">
                  <div className="stat-icon">
                    ✂
                  </div>

                  <span className="stat-label">
                    TEAM
                  </span>
                </div>

                <h3>{activeBarbers}</h3>

                <p>Active Barbers</p>

                <div className="stat-line"></div>
              </div>
            </div>

            {/* QUICK ACTIONS */}

            <div className="section-heading">
              <div>
                <h2>Quick Actions</h2>
                <p>Manage your shop faster</p>
              </div>
            </div>

            <div className="quick-actions">
              <button
                onClick={() => setShowModal(true)}
              >
                <div className="quick-icon blue-icon">
                  ✂
                </div>

                <div>
                  <strong>Add Barber</strong>
                  <span>
                    Add a new team member
                  </span>
                </div>

                <b>→</b>
              </button>

              <button
                onClick={() =>
                  changeSection("orders")
                }
              >
                <div className="quick-icon purple-icon">
                  ◫
                </div>

                <div>
                  <strong>Appointments</strong>
                  <span>
                    Manage customer bookings
                  </span>
                </div>

                <b>→</b>
              </button>

              <button
                onClick={() =>
                  changeSection("availability")
                }
              >
                <div className="quick-icon green-icon">
                  ◷
                </div>

                <div>
                  <strong>Working Hours</strong>
                  <span>
                    Manage shop availability
                  </span>
                </div>

                <b>→</b>
              </button>
            </div>

            {/* TWO COLUMN AREA */}

            <div className="dashboard-grid">
              {/* TODAY APPOINTMENTS */}

              <div className="card appointment-card">
                <div className="card-header">
                  <div>
                    <h2>Today's Appointments</h2>
                    <p>
                      {todayBookings} bookings scheduled
                    </p>
                  </div>

                  <button
                    className="text-button"
                    onClick={() =>
                      changeSection("orders")
                    }
                  >
                    View all →
                  </button>
                </div>

                <div className="appointment-list">
                  {orders.filter((order) => {
                    const today =
                      new Date()
                        .toISOString()
                        .split("T")[0];

                    return (
                      new Date(order.date)
                        .toISOString()
                        .split("T")[0] === today
                    );
                  }).length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">
                        ◷
                      </div>

                      <h3>No appointments today</h3>

                      <p>
                        Your schedule is clear.
                      </p>
                    </div>
                  ) : (
                    orders
                      .filter((order) => {
                        const today =
                          new Date()
                            .toISOString()
                            .split("T")[0];

                        return (
                          new Date(order.date)
                            .toISOString()
                            .split("T")[0] ===
                          today
                        );
                      })
                      .slice(0, 5)
                      .map((order) => (
                        <div
                          className="appointment-item"
                          key={order._id}
                        >
                          <div className="appointment-time">
                            {order.time}
                          </div>

                          <div className="customer-avatar">
                            {getInitial(
                              order.client?.name
                            )}
                          </div>

                          <div className="appointment-info">
                            <strong>
                              {order.client?.name ||
                                "Customer"}
                            </strong>

                            <span>
                              {order.barber?.name ||
                                "Barber"}
                            </span>
                          </div>

                          <span
                            className={`status ${
                              order.status?.toLowerCase()
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* TEAM SUMMARY */}

              <div className="card team-card">
                <div className="card-header">
                  <div>
                    <h2>Your Team</h2>
                    <p>
                      {barbers.length} total barbers
                    </p>
                  </div>

                  <button
                    className="add-small-btn"
                    onClick={() =>
                      setShowModal(true)
                    }
                  >
                    + Add
                  </button>
                </div>

                <div className="team-summary">
                  <div className="team-number">
                    <strong>{activeBarbers}</strong>
                    <span>Active</span>
                  </div>

                  <div className="team-number inactive-team">
                    <strong>{inactiveBarbers}</strong>
                    <span>Inactive</span>
                  </div>
                </div>

                <div className="mini-barbers">
                  {barbers.slice(0, 4).map((barber) => (
                    <div
                      className="mini-barber"
                      key={barber._id}
                    >
                      <div className="mini-avatar">
                        {getInitial(barber.name)}
                      </div>

                      <div>
                        <strong>
                          {barber.name}
                        </strong>

                        <span
                          className={
                            barber.status === "Active"
                              ? "online-text"
                              : "offline-text"
                          }
                        >
                          ● {barber.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {barbers.length > 4 && (
                  <button
                    className="full-width-button"
                    onClick={() =>
                      document
                        .getElementById(
                          "barber-management"
                        )
                        ?.scrollIntoView({
                          behavior: "smooth",
                        })
                    }
                  >
                    Manage team
                  </button>
                )}
              </div>
            </div>

            {/* BARBER MANAGEMENT */}

            <div
              className="card"
              id="barber-management"
            >
              <div className="card-header">
                <div>
                  <h2>Barber Management</h2>

                  <p>
                    Manage your team and their status
                  </p>
                </div>

                <div className="header-actions">
                  <select
                    value={barberFilter}
                    onChange={(e) =>
                      setBarberFilter(
                        e.target.value
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                    <option value="all">
                      All Barbers
                    </option>
                  </select>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setShowModal(true)
                    }
                  >
                    + Add Barber
                  </button>
                </div>
              </div>

              {filteredBarbers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    ✂
                  </div>

                  <h3>No barbers found</h3>

                  <p>
                    Add a barber to start managing
                    your team.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setShowModal(true)
                    }
                  >
                    + Add Barber
                  </button>
                </div>
              ) : (
                <div className="barber-grid">
                  {filteredBarbers.map((barber) => (
                    <div
                      className="barber-card"
                      key={barber._id}
                    >
                      <div className="barber-card-top">
                        <div className="barber-avatar">
                          {getInitial(barber.name)}
                        </div>

                        <span
                          className={`status ${
                            barber.status === "Active"
                              ? "booked"
                              : "inactive"
                          }`}
                        >
                          {barber.status}
                        </span>
                      </div>

                      <div className="barber-info">
                        <h3>{barber.name}</h3>

                        <p>
                          {barber.skills}
                        </p>

                        <span className="location-text">
                          📍 {barber.location}
                        </span>
                      </div>

                      <div className="barber-actions">
                        <button
                          onClick={() =>
                            toggleStatus(
                              barber._id
                            )
                          }
                        >
                          {barber.status ===
                          "Active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() =>
                            deleteBarber(
                              barber._id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= ORDERS ================= */}

        {currentSection === "orders" && (
          <section className="section active">
            <div className="page-intro">
              <div>
                <span className="welcome-tag">
                  BOOKINGS
                </span>

                <h2>Appointment Management</h2>

                <p>
                  Keep track of customer appointments
                  and update their status.
                </p>
              </div>

              <div className="appointment-count">
                <strong>
                  {filteredOrders.length}
                </strong>

                <span>Showing</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2>Appointments</h2>
                  <p>
                    Manage all customer bookings
                  </p>
                </div>

                <select
                  value={orderFilter}
                  onChange={(e) =>
                    setOrderFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="today">
                    Today
                  </option>

                  <option value="all">
                    All Appointments
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Barber</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="empty-row"
                        >
                          No appointments found
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(
                        (order) => (
                          <tr key={order._id}>
                            <td>
                              <div className="table-customer">
                                <div className="customer-avatar">
                                  {getInitial(
                                    order.client
                                      ?.name
                                  )}
                                </div>

                                <div>
                                  <strong>
                                    {order.client
                                      ?.name ||
                                      "Customer"}
                                  </strong>

                                  <span>
                                    {order.client
                                      ?.email ||
                                      "No email"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              {order.barber?.name ||
                                "Unknown"}
                            </td>

                            <td>
                              {formatDate(
                                order.date
                              )}
                            </td>

                            <td>
                              <strong>
                                {formatTime(
                                  order.time
                                )}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`status ${
                                  order.status?.toLowerCase()
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>

                            <td>
                              {order.status ===
                              "Booked" ? (
                                <div className="table-actions">
                                  <button
                                    className="complete-btn"
                                    onClick={() =>
                                      updateStatus(
                                        order._id,
                                        "Completed"
                                      )
                                    }
                                  >
                                    Complete
                                  </button>

                                  <button
                                    className="cancel-btn"
                                    onClick={() =>
                                      updateStatus(
                                        order._id,
                                        "Cancelled"
                                      )
                                    }
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <span className="done-text">
                                  Finished
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================= AVAILABILITY ================= */}

        {currentSection === "availability" && (
          <section className="section active">
            <div className="page-intro">
              <div>
                <span className="welcome-tag">
                  SCHEDULE
                </span>

                <h2>Availability</h2>

                <p>
                  Control when your shop and barbers
                  are available.
                </p>
              </div>
            </div>

            <div className="availability-grid">
              {/* SHOP HOURS */}

              <div className="card availability-card">
                <div className="availability-icon blue-icon">
                  🏪
                </div>

                <h2>Shop Hours</h2>

                <p className="card-description">
                  Set the opening and closing time
                  for your shop.
                </p>

                <div className="time-form">
                  <div>
                    <label>Opening Time</label>

                    <input
                      type="time"
                      value={shopStart}
                      onChange={(e) =>
                        setShopStart(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label>Closing Time</label>

                    <input
                      type="time"
                      value={shopEnd}
                      onChange={(e) =>
                        setShopEnd(
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <button
                  className="primary-button full-button"
                  onClick={
                    saveShopAvailability
                  }
                >
                  Save Shop Hours
                </button>
              </div>

              {/* BARBER HOURS */}

              <div className="card availability-card">
                <div className="availability-icon purple-icon">
                  ✂
                </div>

                <h2>Barber Hours</h2>

                <p className="card-description">
                  Customize working hours for each
                  barber.
                </p>

                <div className="single-form">
                  <label>Select Barber</label>

                  <select
                    value={selectedBarberId}
                    onChange={(e) => {
                      const id =
                        e.target.value;

                      setSelectedBarberId(id);

                      if (id) {
                        const start =
                          localStorage.getItem(
                            "barberStart_" +
                              id
                          );

                        const end =
                          localStorage.getItem(
                            "barberEnd_" +
                              id
                          );

                        setStartTime(
                          start || ""
                        );

                        setEndTime(
                          end || ""
                        );
                      }
                    }}
                  >
                    <option value="">
                      Select Barber
                    </option>

                    {barbers.map((barber) => (
                      <option
                        key={barber._id}
                        value={barber._id}
                      >
                        {barber.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="time-form">
                  <div>
                    <label>Working From</label>

                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) =>
                        setStartTime(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label>Working To</label>

                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) =>
                        setEndTime(
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <button
                  className="primary-button full-button"
                  onClick={saveAvailability}
                >
                  Save Barber Hours
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================= PROFILE ================= */}

        {currentSection === "profile" && (
          <section className="section active">
            <div className="page-intro">
              <div>
                <span className="welcome-tag">
                  SETTINGS
                </span>

                <h2>Shop Profile</h2>

                <p>
                  Manage your shop information.
                </p>
              </div>
            </div>

            <div className="profile-layout">
              <div className="card profile-preview">
                <div className="large-profile">
                  <img
                    src={shopProfile.image}
                    alt="Shop"
                    onError={(e) => {
                      e.currentTarget.src =
                        "/images/default-shop.png";
                    }}
                  />
                </div>

                <h2>{shopProfile.name}</h2>

                <span className="owner-badge">
                  Shop Owner
                </span>

                <div className="profile-stats">
                  <div>
                    <strong>
                      {barbers.length}
                    </strong>

                    <span>Barbers</span>
                  </div>

                  <div>
                    <strong>
                      {totalBookings}
                    </strong>

                    <span>Bookings</span>
                  </div>
                </div>
              </div>

              <div className="card profile-form-card">
                <h2>Shop Information</h2>

                <p className="card-description">
                  Update your basic shop details.
                </p>

                <div className="profile-form">
                  <div className="form-group">
                    <label>Shop Name</label>

                    <input
                      type="text"
                      placeholder={
                        shopProfile.name
                      }
                      defaultValue={
                        shopProfile.name
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Location</label>

                    <input
                      type="text"
                      placeholder="Shop Location"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>

                    <input
                      type="text"
                      placeholder="Phone Number"
                    />
                  </div>

                  <button className="primary-button">
                    Update Profile
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ================= ADD BARBER MODAL ================= */}

      {showModal && (
        <div
          className="modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={closeModal}
            >
              ×
            </button>

            <div className="modal-icon">
              ✂
            </div>

            <h2>Add New Barber</h2>

            <p>
              Add a new member to your shop team.
            </p>

            <div className="modal-form">
              <div>
                <label>Barber Name</label>

                <input
                  type="text"
                  value={formData.bName}
                  placeholder="e.g. Rahul Sharma"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bName: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label>Location</label>

                <input
                  type="text"
                  value={formData.bLocation}
                  placeholder="e.g. Main Branch"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bLocation:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label>Skills</label>

                <input
                  type="text"
                  value={formData.bSkills}
                  placeholder="Haircut, Beard, Fade"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bSkills:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label>Status</label>

                <select
                  value={formData.bStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bStatus:
                        e.target.value,
                    })
                  }
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            <div className="modal-buttons">
              <button
                className="secondary-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                onClick={addBarber}
              >
                Add Barber
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopDashboard;
