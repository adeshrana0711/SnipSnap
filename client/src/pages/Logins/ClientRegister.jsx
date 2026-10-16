
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

    setLoading(true);

    try {
      const res = await apiFetch("/client/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      const result = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok || !result.success) {
        throw new Error(
          result.message ||
            `Registration failed with status ${res.status}`
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Registration Successful",
        text: "Your account has been created!",
      });

      navigate("/client/login");
    } catch (err) {
      console.error("Client registration error:", err);

      await Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text:
          err.message ||
          "Unable to register right now. Please try again.",
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
          <h1>Join SnipSnap Today</h1>

          <p>
            Create your account to book appointments with top barbers
            instantly.
          </p>

          <ul className="feature-list">
            <li>
              <i className="bx bxs-check-circle"></i> Book barbers instantly
            </li>
            <li>
              <i className="bx bxs-check-circle"></i> Track appointment history
            </li>
            <li>
              <i className="bx bxs-check-circle"></i> Secure wallet payments
            </li>
            <li>
              <i className="bx bxs-check-circle"></i> Exclusive member offers
            </li>
          </ul>
        </div>

        <div className="signup-container">
          <h2>Create Account</h2>
          <p className="signup-sub">Register to get started</p>

          <div className="social-container">
            <a href="/auth/google" className="social google">
              <i className="bx bxl-google"></i>
            </a>

            <a href="/auth/facebook" className="social facebook">
              <i className="bx bxl-facebook"></i>
            </a>

            <a href="/auth/twitter" className="social twitter">
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
                />
              </div>
            </div>

            <div className="input-group">
              <div className="input-container">
                <i className="bx bxs-lock-alt"></i>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
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
            Already have an account? <Link to="/client/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientRegister;