import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../utils/api';
import '../styles/VisualSearch.css';

export default function VisualSearch() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setResults(null);
  };

  const handleSearch = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(`${API_BASE_URL}/ai/visual-search`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="visual-search-container">
      <div className="visual-search-header">
        <h1>🔍 Visual Search</h1>
        <p>Upload any saree image to find similar products from our catalog</p>
      </div>

      {!results ? (
        <div className="upload-section">
          {!previewUrl ? (
            <label className="upload-area">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
              />
              <div className="upload-content">
                <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3>Drop an image here</h3>
                <p>or click to browse</p>
                <span className="upload-hint">PNG, JPG up to 10MB</span>
              </div>
            </label>
          ) : (
            <div className="preview-section">
              <img src={previewUrl} alt="Preview" className="preview-image" />
              <div className="preview-actions">
                <button onClick={handleSearch} disabled={loading} className="btn-primary">
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Searching...
                    </>
                  ) : (
                    '🔍 Find Similar Products'
                  )}
                </button>
                <button onClick={clearSearch} className="btn-secondary">
                  Upload Different Image
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <span>⚠️</span>
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="results-section">
          <div className="results-header">
            <div>
              <h2>Found {results.totalMatches} Similar Products</h2>
              {results.visualDescription && (
                <p className="visual-description">{results.visualDescription}</p>
              )}
            </div>
            <button onClick={clearSearch} className="btn-secondary">
              New Search
            </button>
          </div>

          <div className="results-grid">
            {results.results.map((item) => (
              <Link
                key={item._id}
                to={`/product/${item.slug}`}
                className="result-card"
              >
                <div className="similarity-badge">
                  {item.similarityPercent}% match
                </div>
                <div className="result-image">
                  {item.thumbnail ? (
                    <img
                      src={`${API_BASE_URL}/images/${item.thumbnail}`}
                      alt={item.name}
                    />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                </div>
                <div className="result-info">
                  <h3>{item.name}</h3>
                  <p className="result-price">₹{item.price?.toLocaleString()}</p>
                  <div className="result-tags">
                    {item.fabric && <span className="tag">{item.fabric}</span>}
                    {item.colors?.slice(0, 2).map((color) => (
                      <span key={color} className="tag color-tag">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="features-info">
        <h3>How Visual Search Works</h3>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">🎨</span>
            <h4>Color Analysis</h4>
            <p>Identifies dominant colors and patterns</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🧵</span>
            <h4>Fabric Detection</h4>
            <p>Recognizes fabric texture and type</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✨</span>
            <h4>Style Matching</h4>
            <p>Finds similar designs and work styles</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <h4>AI-Powered</h4>
            <p>Advanced machine learning algorithms</p>
          </div>
        </div>
      </div>
    </div>
  );
}
