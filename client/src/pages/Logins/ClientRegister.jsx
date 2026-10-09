import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import "../../styles/regisClient.css";

const ClientRegister = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      name: name,
      email: email,
      password: password,
    };

    try {
      const res = await fetch("/client/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Registration Successful",
          text: "Your account has been created!",
        }).then(() => {
          navigate("/client/login");
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Registration Failed",
          text: result.message || "Something went wrong",
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

          <p>Create your account to book appointments with top barbers instantly.</p>

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
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="login-link">
            Already have an account?
            <Link to="/client/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientRegister;
