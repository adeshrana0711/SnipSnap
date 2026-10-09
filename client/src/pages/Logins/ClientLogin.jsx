import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import "../../styles/loginClient.css";

const ClientLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/client/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (result.success) {
        const nextUrl = new URLSearchParams(location.search).get("next") || "/";
        Swal.fire({
          icon: "success",
          title: "Login Successful",
          text: "Welcome back!",
        }).then(() => {
          navigate(nextUrl);
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Invalid Credentials",
          text: result.message || "Email or password incorrect",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <nav className="login-navbar">
  <div className="login-navbar-inner">
    <Link to="/" className="login-logo">SnipSnap</Link>

    <div className="login-nav-links">
      <Link to="/" className="login-nav-link">Home</Link>
      <Link to="/contact" className="login-nav-link">Contact</Link>
    </div>
  </div>
</nav>
      <div className="main-container">
        <div className="welcome-container">
          <h1>Welcome Back!</h1>

          <p>Login to book appointments and manage your bookings.</p>

          <ul className="feature-list">
            <li>
              <i className="bx bxs-check-circle"></i> Book appointments
              instantly
            </li>
            <li>
              <i className="bx bxs-check-circle"></i> Track booking history
            </li>
            <li>
              <i className="bx bxs-check-circle"></i> Manage wallet
            </li>
          </ul>
        </div>

        <div className="login-container">
          <h2>Client Login</h2>

          <p className="login-subtitle">Sign in to access your account</p>

          <div className="social-container">
            <a href="#" className="social facebook">
              <i className="bx bxl-facebook"></i>
            </a>

            <a href="/auth/google" className="social google">
              <i className="bx bxl-google"></i>
            </a>

            <a href="#" className="social linkedin">
              <i className="bx bxl-linkedin"></i>
            </a>
          </div>

          <div className="divider">OR</div>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <div className="input-container">
                <i className="bx bxs-envelope"></i>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <div className="input-container">
                <i className="bx bxs-lock-alt"></i>

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="signup-link">
            Don't have an account?
            <Link to="/client/registration">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
