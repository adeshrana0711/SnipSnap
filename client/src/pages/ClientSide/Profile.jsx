import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Profile = () => {
  const [userName, setUserName] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");
  const [wallet, setWallet] = useState("₹0");
  const [bookings, setBookings] = useState(0);
  const [profileImage, setProfileImage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [popup, setPopup] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const showPopupMessage = (text) => {
    setPopup(text);
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
    }, 3000);
  };

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");

      if (!res.ok) return;

      const user = await res.json();

      setUserName(user.name);
      setUserEmail(user.email);
      setWallet("₹" + (user.wallet || 0));
      setName(user.name || "");
      setPhone(user.phone || "");

      if (user.image) {
        setProfileImage(user.image);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await fetch("/client/bookings");

      if (!res.ok) return;

      const data = await res.json();
      setBookings(data.length || 0);
    } catch (err) {
      console.error("Error loading bookings:", err);
    }
  };

  useEffect(() => {
    loadProfile();
    loadBookings();
  }, []);

  const handleEditForm = async (e) => {
    e.preventDefault();

    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          phone: phone,
        }),
      });

      showPopupMessage("Profile Updated Successfully");
      loadProfile();
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const handleImageUpload = async (e) => {
    try {
      const formData = new FormData();
      formData.append("image", e.target.files[0]);

      await fetch("/api/profile/image", {
        method: "POST",
        body: formData,
      });

      showPopupMessage("Profile Image Updated");
      loadProfile();
    } catch (err) {
      console.error("Error uploading image:", err);
    }
  };

  return (
    <div>
      <nav>
        <div className="logo">SnipSnap</div>
        <ul className="nav-links">
          <li>
            <Link to="/">
              <i className="bx bx-home"></i>Home
            </Link>
          </li>
          <li>
            <Link to="/profile">
              <i className="bx bx-user"></i>Profile
            </Link>
          </li>
          <li>
            <Link to="/my-bookings">
              <i className="bx bx-calendar"></i>My Bookings
            </Link>
          </li>
          <li>
            <Link to="/wallet">
              <i className="bx bx-wallet"></i>Wallet
            </Link>
          </li>
          <li>
            <Link to="/logout">
              <i className="bx bx-log-out"></i>Logout
            </Link>
          </li>
        </ul>
      </nav>

      <div className="profile-card">
        <div className="avatar-wrapper">
          <img className="profile-image" src={profileImage} alt="Profile" />
          <label className="upload-icon">
            <i className="bx bx-camera"></i>
            <input type="file" onChange={handleImageUpload} />
          </label>
        </div>

        <h2 className="profile-name">{userName}</h2>
        <p className="profile-email">{userEmail}</p>

        <div className="stats">
          <div className="stat">
            <h3>{wallet}</h3>
            <p>Wallet</p>
          </div>
          <div className="stat">
            <h3>{bookings}</h3>
            <p>Bookings</p>
          </div>
        </div>

        <form className="edit-form" onSubmit={handleEditForm}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit" className="save-btn">
            Update Profile
          </button>
        </form>
      </div>

      {showPopup && <div className="popup">{popup}</div>}
    </div>
  );
};

export default Profile;
