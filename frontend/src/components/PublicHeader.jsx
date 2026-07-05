import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/PublicHeader.css";

const PublicHeader = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { label: "NEW ARRIVALS", path: "/category/new-arrivals" },
    { label: "WEDDING", path: "/category/wedding" },
    { label: "FESTIVE", path: "/category/festival" },
    { label: "SAREES", path: "/browse" },
    { label: "FABRICS", path: "/browse?filter=fabric" },
    { label: "OCCASIONS", path: "/browse?filter=occasion" },
  ];

  return (
    <header className="public-header">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <span>📞 +91 98765 43210</span>
            <span>✉️ support@yourstore.com</span>
          </div>
          <div className="top-bar-right">
            <span>🚚 Free Shipping on Orders ₹1,999+</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="main-header">
        <div className="header-content">
          {/* Logo */}
          <Link to="/" className="logo">
            <h1>SAREE HERITAGE</h1>
            <p className="tagline">Timeless Elegance</p>
          </Link>

          {/* Search Bar */}
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for sarees, fabrics, occasions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </form>

          {/* Right Icons */}
          <div className="header-icons">
            <Link to="/admin/login" className="icon-btn" title="Admin Login">
              👤 <span>Account</span>
            </Link>
            <button className="icon-btn" title="Wishlist">
              ❤️ <span>Wishlist</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className={`main-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="nav-content">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.path}
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default PublicHeader;
