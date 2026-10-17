
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

  // Get the shop's current geographical coordinates.
  // Use this while physically at the shop, not at home.
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

    if (formData.latitude === "" || formData.longitude === "") {
      Swal.fire(
        "Location Required",
        "Please capture the shop's coordinates before registering.",
        "warning"
      );
      return;
    }

    setLoading(true);

    const data = new FormData();

    data.append("name", formData.name.trim());
    data.append("owner_name", formData.owner_name.trim());
    data.append("email", formData.email.trim());
    data.append("phone", formData.phone.trim());
    data.append("password", formData.password);
    data.append("location", formData.location.trim());
    data.append("city", formData.city.trim());
    data.append("latitude", formData.latitude);
    data.append("longitude", formData.longitude);

    if (formData.shopImage) {
      data.append("shopImage", formData.shopImage);
    }

    try {
      const response = await fetch("/api/shop/registration", {
        method: "POST",
        body: formData,
        credentials: "include",
      });;

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Shop registration failed."
        );
      }

      await Swal.fire(
        "Success",
        "Shop Registered Successfully",
        "success"
      );

      navigate("/barber/login");
    } catch (error) {
      console.error("Registration error:", error);

      Swal.fire(
        "Registration Failed",
        error.message || "Please check your server and try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <nav>
        <div className="logo">SnipSnap</div>

        <ul className="links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="#">Contact</Link>
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
              <label>Shop Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Owner Name</label>
              <input
                type="text"
                name="owner_name"
                value={formData.owner_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={8}
              />
            </div>

            <div className="input-group">
              <label>Full Shop Address</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Shop number, sector, street, landmark"
                required
              />
            </div>

            <div className="input-group">
              <label>City</label>
              <input
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
                disabled={gettingLocation}
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
              <label>Shop Photo</label>
              <input
                type="file"
                name="shopImage"
                accept="image/*"
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
