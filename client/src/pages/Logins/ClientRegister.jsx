import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import "../../styles/regisClient.css";
import api from "../../api";

const ClientRegister = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (loading) return;

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Frontend validation
    if (!trimmedName) {
      await Swal.fire({
        icon: "warning",
        title: "Name Required",
        text: "Please enter your full name.",
      });
      return;
    }

    if (!normalizedEmail) {
      await Swal.fire({
        icon: "warning",
        title: "Email Required",
        text: "Please enter your email address.",
      });
      return;
    }

    if (password.length < 8) {
      await Swal.fire({
        icon: "warning",
        title: "Weak Password",
        text: "Your password must contain at least 8 characters.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/client/registration", {
        name: trimmedName,
        email: normalizedEmail,
        password,
      });

      const result = response.data;

      if (result?.success === false) {
        throw new Error(
          result.message || "Registration failed. Please try again."
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        text:
          result?.message ||
          "Your SnipSnap account has been created successfully.",
        confirmButtonText: "Continue to Login",
      });

      navigate("/client/login");
    } catch (err) {
      console.error("Client registration error:", {
        message: err.message,
        status: err.response?.status,
        response: err.response?.data,
      });

      let message = "Unable to register right now. Please try again.";

      if (err.response) {
        message =
          err.response.data?.message ||
          err.response.data?.error ||
          `Registration failed with status ${err.response.status}.`;
      } else if (err.request) {
        message =
          "The server did not respond. Please check your internet connection and backend deployment.";
      } else if (err.message) {
        message = err.message;
      }

      await Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: message,
        confirmButtonText: "Try Again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <nav>
        <div
          className="logo"
          onClick={() => navigate("/")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate("/");
          }}
        >
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
          <h1>Join SnipSnap Today</h1>

          <p>
            Create your account to book appointments with top barbers
            instantly.
          </p>

          <ul className="feature-list">
            <li>
              <i className="bx bxs-check-circle"></i>
              Book barbers instantly
            </li>
            <li>
              <i className="bx bxs-check-circle"></i>
              Track appointment history
            </li>
            <li>
              <i className="bx bxs-check-circle"></i>
              Secure advance payments
            </li>
            <li>
              <i className="bx bxs-check-circle"></i>
              Exclusive member offers
            </li>
          </ul>
        </div>

        <div className="signup-container">
          <h2>Create Account</h2>

          <p className="signup-sub">Register to get started</p>

          <div className="social-container">
            <a
              href="/auth/google"
              className="social google"
              aria-label="Register with Google"
            >
              <i className="bx bxl-google"></i>
            </a>

            <a
              href="/auth/facebook"
              className="social facebook"
              aria-label="Register with Facebook"
            >
              <i className="bx bxl-facebook"></i>
            </a>

            <a
              href="/auth/twitter"
              className="social twitter"
              aria-label="Register with Twitter"
            >
              <i className="bx bxl-twitter"></i>
            </a>
          </div>

          <div className="divider">OR</div>

          <form onSubmit={handleRegister}>
            <div className="input-group">
              <div className="input-container">
                <i className="bx bxs-user"></i>

                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  maxLength={100}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <div className="input-container">
                <i className="bx bxs-envelope"></i>

                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  maxLength={254}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <div className="input-container">
                <i className="bx bxs-lock-alt"></i>

                <input
                  type="password"
                  placeholder="Password (minimum 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="login-link">
            Already have an account?{" "}
            <Link to="/client/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientRegister;