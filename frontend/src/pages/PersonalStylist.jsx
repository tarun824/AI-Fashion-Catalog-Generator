import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE_URL } from '../utils/api';
import '../styles/PersonalStylist.css';

export default function PersonalStylist() {
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

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await fetch(`${API_BASE_URL}/ai/personal-stylist`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearAnalysis = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="personal-stylist-container">
      <div className="stylist-header">
        <h1>🎨 AI Personal Stylist</h1>
        <p>Upload your photo and get personalized saree recommendations</p>
        <div className="privacy-notice">
          🔒 Your photos are processed securely and never stored
        </div>
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
                <div className="camera-icon">📸</div>
                <h3>Upload Your Photo</h3>
                <p>Take a selfie or choose from gallery</p>
                <span className="upload-hint">Best results with clear, front-facing photos</span>
              </div>
            </label>
          ) : (
            <div className="preview-section">
              <img src={previewUrl} alt="Preview" className="preview-image" />
              <div className="preview-actions">
                <button onClick={handleAnalyze} disabled={loading} className="btn-primary">
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Analyzing...
                    </>
                  ) : (
                    '✨ Get My Recommendations'
                  )}
                </button>
                <button onClick={clearAnalysis} className="btn-secondary">
                  Choose Different Photo
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
          {/* Analysis Results */}
          <div className="analysis-card">
            <h2>Your Style Profile</h2>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="analysis-icon">🎨</span>
                <h3>Skin Tone</h3>
                <p className="analysis-value">{results.analysis.skinTone}</p>
              </div>
              <div className="analysis-item">
                <span className="analysis-icon">👗</span>
                <h3>Body Type</h3>
                <p className="analysis-value">{results.analysis.bodyType}</p>
              </div>
              <div className="analysis-item">
                <span className="analysis-icon">✨</span>
                <h3>Style Persona</h3>
                <p className="analysis-value">{results.analysis.stylePersona}</p>
              </div>
              <div className="analysis-item">
                <span className="analysis-icon">💫</span>
                <h3>Age Group</h3>
                <p className="analysis-value">{results.analysis.estimatedAge}</p>
              </div>
            </div>
          </div>

          {/* Color Recommendations */}
          <div className="recommendations-card">
            <h2>🎨 Perfect Colors for You</h2>
            <p className="recommendation-reason">{results.recommendations.colors.reason}</p>
            <div className="color-chips">
              {results.recommendations.colors.recommended.map((color) => (
                <div key={color} className="color-chip recommended">
                  <span className="chip-icon">✓</span>
                  {color}
                </div>
              ))}
            </div>
            {results.recommendations.colors.avoid.length > 0 && (
              <>
                <h3 className="avoid-header">Colors to Avoid</h3>
                <div className="color-chips">
                  {results.recommendations.colors.avoid.map((color) => (
                    <div key={color} className="color-chip avoid">
                      <span className="chip-icon">✗</span>
                      {color}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Fabric Recommendations */}
          <div className="recommendations-card">
            <h2>🧵 Best Fabrics for You</h2>
            <p className="recommendation-reason">{results.recommendations.fabrics.reason}</p>
            <div className="fabric-list">
              {results.recommendations.fabrics.recommended.map((fabric) => (
                <div key={fabric} className="fabric-item">
                  <span className="fabric-icon">✓</span>
                  {fabric}
                </div>
              ))}
            </div>
          </div>

          {/* Style Tips */}
          {results.recommendations.styles.length > 0 && (
            <div className="recommendations-card">
              <h2>💡 Styling Tips</h2>
              <ul className="tips-list">
                {results.recommendations.styles.map((tip, index) => (
                  <li key={index}>
                    <span className="tip-icon">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Personalized Products */}
          <div className="products-section">
            <div className="products-header">
              <h2>🌟 Curated Just for You ({results.products.length} Sarees)</h2>
              <button onClick={clearAnalysis} className="btn-secondary">
                New Analysis
              </button>
            </div>

            <div className="products-grid">
              {results.products.map((product) => (
                <Link
                  key={product._id}
                  to={`/product/${product.slug}`}
                  className="product-card"
                >
                  <div className="product-image">
                    {product.thumbnail ? (
                      <img
                        src={`${API_BASE_URL}/images/${product.thumbnail}`}
                        alt={product.name}
                      />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </div>
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="product-price">₹{product.price?.toLocaleString()}</p>
                    <div className="product-tags">
                      {product.fabric && <span className="tag">{product.fabric}</span>}
                      {product.colors?.slice(0, 2).map((color) => (
                        <span key={color} className="tag">{color}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="benefits-section">
        <h3>Why Use AI Personal Stylist?</h3>
        <div className="benefits-grid">
          <div className="benefit-item">
            <span className="benefit-icon">🎯</span>
            <h4>Personalized</h4>
            <p>Recommendations tailored to your unique features</p>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">⚡</span>
            <h4>Instant</h4>
            <p>Get results in seconds using AI technology</p>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">👗</span>
            <h4>Professional</h4>
            <p>Expert styling knowledge from fashion experts</p>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">💰</span>
            <h4>Free</h4>
            <p>No cost - completely free for all customers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
