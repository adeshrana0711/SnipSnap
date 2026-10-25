import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    owner_name: "",
    email: "",
    phone: "",
    password: "",
    location: "",
    city: "",
    latitude: "",
    longitude: "",
    shopImage: null,
  });

  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      shopImage: e.target.files?.[0] || null,
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire(
        "Not Supported",
        "Your browser does not support location access.",
        "error"
      );
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));

        setGettingLocation(false);

        Swal.fire(
          "Location Captured",
          "Shop coordinates have been captured successfully.",
          "success"
        );
      },
      (error) => {
        setGettingLocation(false);

        let message = "Unable to get your location.";

        if (error.code === error.PERMISSION_DENIED) {
          message = "Please allow location access in your browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Your location is currently unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out. Please try again.";
        }

        Swal.fire("Location Error", message, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const {
      name,
      owner_name,
      email,
      phone,
      password,
      location,
      city,
      latitude,
      longitude,
      shopImage,
    } = formData;

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !location.trim() ||
      !city.trim()
    ) {
      await Swal.fire(
        "Missing Details",
        "Please fill in all required shop details.",
        "warning"
      );
      return;
    }

    if (latitude === "" || longitude === "") {
      await Swal.fire(
        "Location Required",
        "Please capture the shop's coordinates before registering.",
        "warning"
      );
      return;
    }

    if (!shopImage) {
      await Swal.fire(
        "Photo Required",
        "Please select a shop photo.",
        "warning"
      );
      return;
    }

    setLoading(true);

    try {
      // Create a real multipart FormData object.
      const data = new FormData();

      data.append("name", name.trim());
      data.append("owner_name", owner_name.trim());
      data.append("email", email.trim().toLowerCase());
      data.append("phone", phone.trim());
      data.append("password", password);
      data.append("location", location.trim());
      data.append("city", city.trim());
      data.append("latitude", String(latitude));
      data.append("longitude", String(longitude));
      data.append("shopImage", shopImage);

      const response = await fetch("/api/shop/registration", {
        method: "POST",
        credentials: "include",
        body: data,
      });

      const contentType = response.headers.get("content-type") || "";

      const result = contentType.includes("application/json")
        ? await response.json()
        : {
          success: false,
          message: await response.text(),
        };

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Registration failed (${response.status})`
        );
      }

      await Swal.fire(
        "Success",
        result.message || "Shop registered successfully.",
        "success"
      );

      navigate("/barber/login");
    } catch (error) {
      console.error("Shop registration error:", error);

      await Swal.fire(
        "Registration Failed",
        error.message || "Please check your connection and try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <nav>
        <div className="logo" onClick={() => navigate("/")}>
          SnipSnap
        </div>

        <ul className="links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/contact">Contact</Link>
          </li>
        </ul>
      </nav>

      <div className="main-container">
        <div className="welcome-container">
          <h1>Register Your Shop</h1>
          <p>Join SnipSnap and start receiving bookings.</p>
        </div>

        <div className="register-container">
          <h2>Shop Registration</h2>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="name">Shop Name</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="owner_name">Owner Name</label>
              <input
                id="owner_name"
                type="text"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="location">Full Shop Address</label>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Shop number, sector, street, landmark"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="e.g. Chandigarh"
                required
              />
            </div>

            <div className="input-group">
              <label>Shop Coordinates</label>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={gettingLocation || loading}
                className="submit-btn"
              >
                {gettingLocation
                  ? "Getting Location..."
                  : "📍 Use My Location"}
              </button>

              {formData.latitude && formData.longitude && (
                <p>
                  Coordinates captured: {formData.latitude},{" "}
                  {formData.longitude}
                </p>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="shopImage">Shop Photo</label>
              <input
                id="shopImage"
                type="file"
                name="shopImage"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                required
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading || gettingLocation}
            >
              {loading ? "Registering Shop..." : "Register Shop"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;