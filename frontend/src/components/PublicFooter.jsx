import React from "react";
import { Link } from "react-router-dom";
import "../styles/PublicFooter.css";

const PublicFooter = () => {
  // Environment variables for branding and contact info
  const storeName = import.meta.env.VITE_STORE_NAME || 'SAREE HERITAGE';
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@yourstore.com';
  const whatsappPhone = import.meta.env.VITE_WHATSAPP_PHONE || '919876543210';
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || 'https://facebook.com';
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || 'https://instagram.com';
  const twitterUrl = import.meta.env.VITE_TWITTER_URL || 'https://twitter.com';
  const pinterestUrl = import.meta.env.VITE_PINTEREST_URL || 'https://pinterest.com';

  return (
    <footer className="public-footer">
      <div className="footer-content">
        {/* About Section */}
        <div className="footer-column">
          <h3 className="footer-title">{storeName}</h3>
          <p className="footer-about">
            Discover the finest collection of handcrafted sarees from across
            India. Traditional elegance meets modern sophistication.
          </p>
          <div className="social-links">
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              📘
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              📷
            </a>
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              🐦
            </a>
            <a
              href={pinterestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              📌
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-column">
          <h4 className="footer-heading">SHOP BY OCCASION</h4>
          <ul className="footer-links">
            <li>
              <Link to="/category/wedding">Wedding Sarees</Link>
            </li>
            <li>
              <Link to="/category/haldi">Haldi Ceremony</Link>
            </li>
            <li>
              <Link to="/category/mehendi">Mehendi Function</Link>
            </li>
            <li>
              <Link to="/category/sangeet">Sangeet Night</Link>
            </li>
            <li>
              <Link to="/category/reception">Reception</Link>
            </li>
            <li>
              <Link to="/category/festival">Festival Wear</Link>
            </li>
          </ul>
        </div>

        {/* Shop by Fabric */}
        <div className="footer-column">
          <h4 className="footer-heading">SHOP BY FABRIC</h4>
          <ul className="footer-links">
            <li>
              <Link to="/category/banarasi-silk">Banarasi Silk</Link>
            </li>
            <li>
              <Link to="/category/kanjivaram">Kanjivaram</Link>
            </li>
            <li>
              <Link to="/category/pure-silk">Pure Silk</Link>
            </li>
            <li>
              <Link to="/category/cotton">Cotton</Link>
            </li>
            <li>
              <Link to="/category/georgette">Georgette</Link>
            </li>
            <li>
              <Link to="/category/chiffon">Chiffon</Link>
            </li>
          </ul>
        </div>

        {/* Customer Care */}
        <div className="footer-column">
          <h4 className="footer-heading">CUSTOMER CARE</h4>
          <ul className="footer-links">
            <li>
              <a href="/contact">Contact Us</a>
            </li>
            <li>
              <a href="/shipping">Shipping Policy</a>
            </li>
            <li>
              <a href="/returns">Returns & Exchange</a>
            </li>
            <li>
              <a href="/size-guide">Size Guide</a>
            </li>
            <li>
              <a href="/faq">FAQs</a>
            </li>
            <li>
              <a href="/track-order">Track Order</a>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="footer-column">
          <h4 className="footer-heading">CONTACT US</h4>
          <div className="contact-info">
            <p>📞 +91 98765 43210</p>
            <p>📱 +91 98765 43211</p>
            <p>✉️ {supportEmail}</p>
            <p>📍 Mumbai, Maharashtra, India</p>
          </div>
          <div className="whatsapp-footer">
            <a
              href={`https://wa.me/${whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-link"
            >
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; 2026 {storeName}. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms & Conditions</a>
            <a href="/admin/login">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
