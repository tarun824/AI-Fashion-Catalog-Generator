import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDarkMode } from "../contexts/DarkModeContext";
import "../styles/PublicHeader.css";

const PublicHeader = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleDarkMode } = useDarkMode();
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

  const aiFeatures = [
    { label: "🔍 Visual Search", path: "/visual-search", icon: "🔍" },
    { label: "🎨 Personal Stylist", path: "/personal-stylist", icon: "🎨" },
  ];

  return (
    <header className="public-header">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <span>
              📞 {import.meta.env.VITE_SUPPORT_PHONE || "+91 98765 43210"}
            </span>
            <span>
              ✉️ {import.meta.env.VITE_SUPPORT_EMAIL || "support@yourstore.com"}
            </span>
          </div>
          <div className="top-bar-right">
            <span>
              🚚 Free Shipping on Orders ₹
              {(
                import.meta.env.VITE_FREE_SHIPPING_THRESHOLD || 1999
              ).toLocaleString()}
              +
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="main-header">
        <div className="header-content">
          {/* Logo */}
          <Link to="/" className="logo">
            <h1>{import.meta.env.VITE_STORE_NAME || "SAREE HERITAGE"}</h1>
            <p className="tagline">
              {import.meta.env.VITE_STORE_TAGLINE || "Timeless Elegance"}
            </p>
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
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="icon-btn"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
              <span>{isDark ? "Light" : "Dark"}</span>
            </button>
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

          {/* AI Features - Highlighted */}
          <div className="nav-divider"></div>
          {aiFeatures.map((feature, idx) => (
            <Link
              key={idx}
              to={feature.path}
              className="nav-link ai-feature"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="ai-badge">AI</span>
              {feature.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default PublicHeader;
