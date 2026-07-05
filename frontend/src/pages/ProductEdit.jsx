import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    status: "draft",
    tags: "",
    fabric: "",
    borderType: "",
    occasion: "",
    workType: "",
    weight: "",
    blouseIncluded: false,
    description: {
      full: "",
    },
  });

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await api.get(`/api/admin/products/${id}`);
      const product = response.data;
      setFormData({
        name: product.name || "",
        category: product.category || "",
        price: product.price?.amount ?? "",
        status: product.status || "draft",
        tags: product.tags?.join(", ") || "",
        fabric: product.fabric || "",
        borderType: product.borderType || "",
        occasion: product.occasion || "",
        workType: product.workType || "",
        weight: product.weight || "",
        blouseIncluded: Boolean(product.blouseIncluded),
        description: {
          full: product.description?.full || "",
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const updateData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: {
          amount: formData.price === "" ? null : Number(formData.price),
        },
        status: formData.status,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        fabric: formData.fabric.trim(),
        borderType: formData.borderType.trim(),
        occasion: formData.occasion.trim(),
        workType: formData.workType.trim(),
        weight: formData.weight,
        blouseIncluded: formData.blouseIncluded,
        description: {
          full: formData.description.full.trim(),
        },
      };

      await api.put(`/api/admin/products/${id}`, updateData);
      navigate(`/dashboard/products/${id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/dashboard/products/${id}`}
          className="text-indigo-600 hover:text-indigo-900 text-sm mb-2 inline-block"
        >
          ← Back to Product
        </Link>
        <h2 className="text-3xl font-bold text-gray-900">Edit Product</h2>
        <p className="text-gray-600 mt-1">Update product information</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="e.g., Red Silk Saree with Gold Border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="e.g., Saree, Kurta, Dress"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="AI-suggested price shown here"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleChange("tags", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="festive, traditional, silk, ethnic"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate tags with commas for better organization and search
              </p>
            </div>
          </div>
        </div>

        {/* Saree Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Saree Details
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fabric
              </label>
              <input
                type="text"
                value={formData.fabric}
                onChange={(e) => handleChange("fabric", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., Kanjivaram Silk"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Border Type
              </label>
              <input
                type="text"
                value={formData.borderType}
                onChange={(e) => handleChange("borderType", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., Temple Border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Occasion
              </label>
              <input
                type="text"
                value={formData.occasion}
                onChange={(e) => handleChange("occasion", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., Bridal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Type
              </label>
              <input
                type="text"
                value={formData.workType}
                onChange={(e) => handleChange("workType", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., Zari"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight
              </label>
              <select
                value={formData.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Unspecified</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-8">
              <input
                id="blouseIncluded"
                type="checkbox"
                checked={formData.blouseIncluded}
                onChange={(e) =>
                  handleChange("blouseIncluded", e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <label htmlFor="blouseIncluded" className="text-sm text-gray-700">
                Blouse included
              </label>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Description
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Description *
            </label>
            <textarea
              value={formData.description.full}
              onChange={(e) => handleChange("description.full", e.target.value)}
              required
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"
              placeholder="Enter detailed product description..."
            />
            <p className="text-xs text-gray-500 mt-1">
              This description will be used for search and display
            </p>
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Color information and images cannot be edited
            through this form. They are extracted from the original AI
            processing.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Link
            to={`/dashboard/products/${id}`}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
