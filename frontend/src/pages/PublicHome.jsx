import React from "react";
import { Link } from "react-router-dom";
import "../styles/PublicHome.css";

/**
 * Public Home Page
 * Main landing page for saree storefront
 */
const PublicHome = () => {
  return (
    <div className="public-home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Timeless Elegance for Your Special Moments
          </h1>
          <p className="hero-subtitle">
            Discover Handcrafted Sarees for Every Celebration
          </p>
          <Link to="/browse" className="btn-primary">
            Shop Collection
          </Link>
        </div>
      </section>

      {/* Shop by Occasion */}
      <section className="occasion-section">
        <div className="section-header">
          <h2>Shop by Occasion</h2>
          <p className="subtitle">
            Find the Perfect Saree for Every Celebration
          </p>
        </div>

        <div className="occasion-grid">
          <OccasionCard
            title="HALDI"
            description="Yellow & Pastel Sarees"
            link="/category/haldi"
            color="#FFD700"
          />
          <OccasionCard
            title="MEHENDI"
            description="Green & Festive Sarees"
            link="/category/mehendi"
            color="#06A77D"
          />
          <OccasionCard
            title="SANGEET"
            description="Party & Glam Sarees"
            link="/category/sangeet"
            color="#E91E63"
          />
          <OccasionCard
            title="WEDDING"
            description="Bridal Silk Sarees"
            link="/category/wedding"
            color="#8B2635"
          />
          <OccasionCard
            title="RECEPTION"
            description="Elegant Designer Sarees"
            link="/category/reception"
            color="#1E88E5"
          />
          <OccasionCard
            title="FESTIVE"
            description="Traditional Handlooms"
            link="/category/festival"
            color="#FF6F00"
          />
          <OccasionCard
            title="CASUAL"
            description="Daily Wear Comfort"
            link="/category/casual"
            color="#607D8B"
          />
          <OccasionCard
            title="PARTY"
            description="Contemporary Styles"
            link="/category/party"
            color="#9C27B0"
          />
        </div>
      </section>

      {/* Shop by Fabric */}
      <section className="fabric-section">
        <div className="section-header">
          <h2>Shop by Fabric</h2>
          <p className="subtitle">Authentic Handlooms & Premium Silks</p>
        </div>

        <div className="fabric-grid">
          <FabricCard
            title="BANARASI SILK"
            link="/category/banarasi-silk"
            startingPrice="8,999"
          />
          <FabricCard
            title="KANJIVARAM"
            link="/category/kanjivaram-silk"
            startingPrice="12,999"
          />
          <FabricCard
            title="PURE SILK"
            link="/category/pure-silk"
            startingPrice="4,999"
          />
          <FabricCard
            title="COTTON"
            link="/category/cotton"
            startingPrice="1,999"
          />
          <FabricCard
            title="GEORGETTE"
            link="/category/georgette"
            startingPrice="2,499"
          />
        </div>
      </section>

      {/* Why Shop With Us */}
      <section className="features-section">
        <div className="features-grid">
          <FeatureCard
            icon="🚚"
            title="FREE SHIPPING"
            description="On orders ₹1,999+"
          />
          <FeatureCard
            icon="🔄"
            title="EASY RETURNS"
            description="7-day return policy"
          />
          <FeatureCard
            icon="✅"
            title="QUALITY ASSURED"
            description="Authentic products"
          />
          <FeatureCard
            icon="🔒"
            title="100% SECURE"
            description="Payment guarantee"
          />
        </div>
      </section>
    </div>
  );
};

// Occasion Card Component
const OccasionCard = ({ title, description, link, color }) => {
  return (
    <Link to={link} className="occasion-card">
      <div className="occasion-card-inner" style={{ borderColor: color }}>
        <h3 style={{ color }}>{title}</h3>
        <p>{description}</p>
      </div>
    </Link>
  );
};

// Fabric Card Component
const FabricCard = ({ title, link, startingPrice }) => {
  return (
    <Link to={link} className="fabric-card">
      <h3>{title}</h3>
      <p className="starting-price">Starting ₹{startingPrice}</p>
    </Link>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

export default PublicHome;
