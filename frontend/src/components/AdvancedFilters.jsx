import React, { useState } from "react";
import "../styles/AdvancedFilters.css";

const AdvancedFilters = ({ onFilterChange, availableOptions }) => {
  const [filters, setFilters] = useState({
    fabrics: [],
    occasions: [],
    colors: [],
    workTypes: [],
    priceMin: "",
    priceMax: "",
    sortBy: "newest",
  });

  const [expandedSections, setExpandedSections] = useState({
    fabric: true,
    occasion: true,
    color: false,
    price: true,
    work: false,
  });

  const handleFilterChange = (type, value) => {
    let updated = { ...filters };

    if (type === "priceMin" || type === "priceMax" || type === "sortBy") {
      updated[type] = value;
    } else {
      // Toggle checkbox
      const key = type + "s"; // fabrics, occasions, etc.
      const current = updated[key] || [];
      updated[key] = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
    }

    setFilters(updated);
    onFilterChange(updated);
  };

  const clearAllFilters = () => {
    const cleared = {
      fabrics: [],
      occasions: [],
      colors: [],
      workTypes: [],
      priceMin: "",
      priceMax: "",
      sortBy: "newest",
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const activeFilterCount =
    (filters.fabrics?.length || 0) +
    (filters.occasions?.length || 0) +
    (filters.colors?.length || 0) +
    (filters.workTypes?.length || 0) +
    (filters.priceMin ? 1 : 0) +
    (filters.priceMax ? 1 : 0);

  return (
    <div className="advanced-filters">
      <div className="filters-header">
        <h3>Filters</h3>
        {activeFilterCount > 0 && (
          <button className="clear-filters-btn" onClick={clearAllFilters}>
            Clear All ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="filter-section">
        <label className="filter-label">Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange("sortBy", e.target.value)}
          className="filter-select"
        >
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection("price")}
        >
          <span>Price Range</span>
          <span className="toggle-icon">
            {expandedSections.price ? "−" : "+"}
          </span>
        </button>
        {expandedSections.price && (
          <div className="filter-section-content">
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceMin}
                onChange={(e) => handleFilterChange("priceMin", e.target.value)}
                className="price-input"
              />
              <span className="price-separator">to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceMax}
                onChange={(e) => handleFilterChange("priceMax", e.target.value)}
                className="price-input"
              />
            </div>
            <div className="price-shortcuts">
              <button
                onClick={() => {
                  handleFilterChange("priceMin", "");
                  handleFilterChange("priceMax", "2000");
                }}
              >
                Under ₹2K
              </button>
              <button
                onClick={() => {
                  handleFilterChange("priceMin", "2000");
                  handleFilterChange("priceMax", "5000");
                }}
              >
                ₹2K - ₹5K
              </button>
              <button
                onClick={() => {
                  handleFilterChange("priceMin", "5000");
                  handleFilterChange("priceMax", "10000");
                }}
              >
                ₹5K - ₹10K
              </button>
              <button
                onClick={() => {
                  handleFilterChange("priceMin", "10000");
                  handleFilterChange("priceMax", "");
                }}
              >
                ₹10K+
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fabric */}
      {availableOptions?.fabrics && availableOptions.fabrics.length > 0 && (
        <div className="filter-section">
          <button
            className="filter-section-header"
            onClick={() => toggleSection("fabric")}
          >
            <span>
              Fabric
              {filters.fabrics?.length > 0 && (
                <span className="filter-count">({filters.fabrics.length})</span>
              )}
            </span>
            <span className="toggle-icon">
              {expandedSections.fabric ? "−" : "+"}
            </span>
          </button>
          {expandedSections.fabric && (
            <div className="filter-section-content">
              {availableOptions.fabrics.map((fabric) => (
                <label key={fabric} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.fabrics?.includes(fabric) || false}
                    onChange={() => handleFilterChange("fabric", fabric)}
                  />
                  <span>{fabric}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Occasion */}
      {availableOptions?.occasions && availableOptions.occasions.length > 0 && (
        <div className="filter-section">
          <button
            className="filter-section-header"
            onClick={() => toggleSection("occasion")}
          >
            <span>
              Occasion
              {filters.occasions?.length > 0 && (
                <span className="filter-count">
                  ({filters.occasions.length})
                </span>
              )}
            </span>
            <span className="toggle-icon">
              {expandedSections.occasion ? "−" : "+"}
            </span>
          </button>
          {expandedSections.occasion && (
            <div className="filter-section-content">
              {availableOptions.occasions.map((occasion) => (
                <label key={occasion} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.occasions?.includes(occasion) || false}
                    onChange={() => handleFilterChange("occasion", occasion)}
                  />
                  <span>{occasion}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Colors */}
      {availableOptions?.colors && availableOptions.colors.length > 0 && (
        <div className="filter-section">
          <button
            className="filter-section-header"
            onClick={() => toggleSection("color")}
          >
            <span>
              Color
              {filters.colors?.length > 0 && (
                <span className="filter-count">({filters.colors.length})</span>
              )}
            </span>
            <span className="toggle-icon">
              {expandedSections.color ? "−" : "+"}
            </span>
          </button>
          {expandedSections.color && (
            <div className="filter-section-content">
              <div className="color-swatches">
                {availableOptions.colors.map((color) => (
                  <button
                    key={color}
                    className={`color-swatch ${filters.colors?.includes(color) ? "selected" : ""}`}
                    onClick={() => handleFilterChange("color", color)}
                    style={{ backgroundColor: color.toLowerCase() }}
                    title={color}
                  >
                    {filters.colors?.includes(color) && (
                      <span className="checkmark">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Work Type */}
      {availableOptions?.workTypes && availableOptions.workTypes.length > 0 && (
        <div className="filter-section">
          <button
            className="filter-section-header"
            onClick={() => toggleSection("work")}
          >
            <span>
              Work Type
              {filters.workTypes?.length > 0 && (
                <span className="filter-count">
                  ({filters.workTypes.length})
                </span>
              )}
            </span>
            <span className="toggle-icon">
              {expandedSections.work ? "−" : "+"}
            </span>
          </button>
          {expandedSections.work && (
            <div className="filter-section-content">
              {availableOptions.workTypes.map((work) => (
                <label key={work} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.workTypes?.includes(work) || false}
                    onChange={() => handleFilterChange("workType", work)}
                  />
                  <span>{work}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;
