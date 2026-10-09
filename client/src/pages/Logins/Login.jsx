import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Swal from "sweetalert2";
import "../../styles/loginClient.css";

const Login = ({ role: initialRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const role =
    initialRole ||
    (location.pathname.includes("/client") ? "client" : "barber");
  const isClient = role === "client";

  const authUrl = isClient ? "/client/login" : "/api/shop/login";
  const signUpUrl = isClient ? "/client/registration" : "/barber/registration";
  const defaultRedirect = isClient ? "/" : "/shop/dashboard";
  const nextUrl = new URLSearchParams(location.search).get("next") || defaultRedirect;

  const pageTitle = isClient ? "Client Login" : "Shop Login";
  const pageDescription = isClient
    ? "Login to book appointments and manage your bookings."
    : "Login to manage your shop and barber appointments.";

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let result = { success: false, message: "Server Error" };
      try {
        result = await res.json();
      } catch (parseError) {
        console.error("Login response parse error:", parseError);
      }

      if (res.ok && result.success) {
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
          title: "Login Failed",
          text: result.message || `Status ${res.status}`,
        });
      }
    } catch (err) {
      console.error("Login request error:", err);
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
      <nav>
        <div className="logo" onClick={() => navigate("/")}>
          SnipSnap
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

      <div className="main-container">
        <div className="welcome-container">
          <h1>Welcome Back!</h1>
          <p>{pageDescription}</p>

          <ul className="feature-list">
            <li>
              <i className="bx bxs-check-circle"></i> Fast and secure login
            </li>
            <li>
              <i className="bx bxs-check-circle"></i> Access your dashboard instantly
            </li>
            <li>
              <i className="bx bxs-check-circle"></i> Continue where you left off
            </li>
          </ul>
        </div>

        <div className="login-container">
          <h2>{pageTitle}</h2>

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
            <Link to={signUpUrl}>{isClient ? "Sign Up" : "Sign up"}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
