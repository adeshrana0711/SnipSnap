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
    shopImage: null,
  });
  const [loading, setLoading] = useState(false);

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
      shopImage: e.target.files[0],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("owner_name", formData.owner_name);
    data.append("email", formData.email);
    data.append("phone", formData.phone);
    data.append("password", formData.password);
    data.append("location", formData.location);
    if (formData.shopImage) {
      data.append("shopImage", formData.shopImage);
    }

    try {
      const response = await fetch("/api/shop/registration", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (result.success) {
        Swal.fire("Success", "Shop Registered Successfully", "success").then(
          () => {
            navigate("/barber/login");
          }
        );
      } else {
        Swal.fire("Error", result.message, "error");
      }
    } catch (error) {
      Swal.fire("Server Error", "Please try again later", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ================= NAVBAR ================= */}
      <nav>
        <div className="logo">SnipSnap
        </div>

        <ul className="links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="#">Contact</Link>
          </li>
        </ul>
      </nav>

      {/* ================= MAIN CONTENT ================= */}
      <div className="main-container">
        {/* LEFT SIDE */}
        <div className="welcome-container">
          <h1>Register Your Shop</h1>

          <p>Join SnipSnap and start receiving bookings.</p>
        </div>

        {/* RIGHT SIDE FORM */}
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
                type="text"
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
              />
            </div>

            <div className="input-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
              />
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

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Registering Shop..." : "Register Shop"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
