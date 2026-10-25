import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import "../../styles/loginClient.css";
import { apiFetch } from "../../api";

const ClientLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    try {
      const res = await apiFetch("/client/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok || result.success === false) {
        throw new Error(
          result.message || `Login failed (${res.status})`
        );
      }

      const requestedUrl =
        new URLSearchParams(location.search).get("next") || "/";

      // Only allow internal application paths.
      const nextUrl =
        requestedUrl.startsWith("/") &&
          !requestedUrl.startsWith("//")
          ? requestedUrl
          : "/";

      await Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: "Welcome back!",
      });

      navigate(nextUrl);
    } catch (err) {
      console.error("Client login error:", err);

      await Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: err.message || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <nav className="login-navbar">
        <div className="login-navbar-inner">
          <Link to="/" className="login-logo">
            SnipSnap
          </Link>

          <div className="login-nav-links">
            <Link to="/" className="login-nav-link">
              Home
            </Link>
            <Link to="/contact" className="login-nav-link">
              Contact
            </Link>
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
          <p className="login-subtitle">
            Sign in to access your account
          </p>

          <div className="social-container">
            <a
              href="/auth/google"
              className="social google"
              aria-label="Sign in with Google"
            >
              <i className="bx bxl-google"></i>
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
                  autoComplete="email"
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
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="signup-link">
            Don't have an account?{" "}
            <Link to="/client/registration">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
