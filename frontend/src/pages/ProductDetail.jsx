import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";
import { format } from "date-fns";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantForm, setVariantForm] = useState({
    size: "",
    color: "",
    stock: "",
  });
  const [savingVariant, setSavingVariant] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await api.get(`/admin/products/${id}`);
      setProduct(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/admin/products/${id}/status`, { status });
      loadProduct();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this product? This cannot be undone.")) return;

    try {
      await api.delete(`/admin/products/${id}`);
      navigate("/dashboard/products");
    } catch (err) {
      alert("Failed to delete product: " + err.message);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    setSavingVariant(true);

    try {
      await api.post(`/admin/products/${id}/variants`, {
        size: variantForm.size.trim(),
        color: variantForm.color.trim(),
        stock: Number(variantForm.stock) || 0,
      });
      setVariantForm({ size: "", color: "", stock: "" });
      loadProduct();
    } catch (err) {
      alert("Failed to add variant: " + err.message);
    } finally {
      setSavingVariant(false);
    }
  };

  const handleVariantStockChange = async (variantId, stock) => {
    try {
      await api.put(`/admin/products/${id}/variants/${variantId}`, {
        stock: Number(stock) || 0,
      });
      loadProduct();
    } catch (err) {
      alert("Failed to update stock: " + err.message);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!confirm("Remove this variant?")) return;
    try {
      await api.delete(`/admin/products/${id}/variants/${variantId}`);
      loadProduct();
    } catch (err) {
      alert("Failed to remove variant: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error: {error || "Product not found"}
        </div>
        <Link
          to="/dashboard/products"
          className="text-indigo-600 hover:text-indigo-900"
        >
          ← Back to Products
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-yellow-100 text-yellow-800",
      published: "bg-green-100 text-green-800",
      archived: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status] || ""}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link
            to="/dashboard/products"
            className="text-indigo-600 hover:text-indigo-900 text-sm mb-2 inline-block"
          >
            ← Back to Products
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">{product.name}</h2>
          <p className="text-gray-600 mt-1">
            SKU: {product.sku}
            {product.category && <> • {product.category}</>}
            {product.price?.amount != null && <> • ₹{product.price.amount}</>}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            to={`/dashboard/products/${id}/edit`}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          {product.images?.original?.gridFsId && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Images
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Original</p>
                  <img
                    src={api.getImageUrl(product.images.original.gridFsId)}
                    alt={product.name}
                    className="w-full rounded-lg border border-gray-200"
                  />
                </div>
                {product.images?.thumbnail?.gridFsId && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Thumbnail (150x150)
                    </p>
                    <img
                      src={api.getImageUrl(product.images.thumbnail.gridFsId)}
                      alt={product.name}
                      className="w-32 h-32 rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Description
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {product.description?.full || "No description available"}
            </p>

            {product.description?.parsed && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                {Object.entries(product.description.parsed).map(
                  ([key, value]) => (
                    <div key={key}>
                      <p className="text-sm font-medium text-gray-500 capitalize">
                        {key}
                      </p>
                      <p className="text-gray-900">{value || "N/A"}</p>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Saree Details */}
          {(product.fabric ||
            product.borderType ||
            product.occasion ||
            product.workType ||
            product.weight ||
            product.vendorId) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Saree Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {product.fabric && (
                  <div>
                    <p className="text-gray-500">Fabric</p>
                    <p className="text-gray-900 font-medium">
                      {product.fabric}
                    </p>
                  </div>
                )}
                {product.borderType && (
                  <div>
                    <p className="text-gray-500">Border Type</p>
                    <p className="text-gray-900 font-medium">
                      {product.borderType}
                    </p>
                  </div>
                )}
                {product.occasion && (
                  <div>
                    <p className="text-gray-500">Occasion</p>
                    <p className="text-gray-900 font-medium">
                      {product.occasion}
                    </p>
                  </div>
                )}
                {product.workType && (
                  <div>
                    <p className="text-gray-500">Work Type</p>
                    <p className="text-gray-900 font-medium">
                      {product.workType}
                    </p>
                  </div>
                )}
                {product.weight && (
                  <div>
                    <p className="text-gray-500">Weight</p>
                    <p className="text-gray-900 font-medium capitalize">
                      {product.weight}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">Blouse Included</p>
                  <p className="text-gray-900 font-medium">
                    {product.blouseIncluded ? "Yes" : "No"}
                  </p>
                </div>
                {product.vendorId?.businessName && (
                  <div>
                    <p className="text-gray-500">Vendor</p>
                    <p className="text-gray-900 font-medium">
                      {product.vendorId.businessName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Colors */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Colors</h3>

            {product.colors?.names && product.colors.names.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Color Names
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.names.map((color, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>

                {product.colors?.families &&
                  product.colors.families.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        Color Families
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {product.colors.families.map((family, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full"
                          >
                            {family}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {product.colors?.percentages &&
                  product.colors.percentages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        Color Distribution
                      </p>
                      <div className="space-y-2">
                        {product.colors.percentages.map((item, i) => (
                          <div key={i} className="flex items-center space-x-3">
                            <span className="text-sm text-gray-700 w-24">
                              {item.name}
                            </span>
                            <div className="flex-1 bg-gray-200 rounded-full h-4">
                              <div
                                className="bg-indigo-600 h-4 rounded-full"
                                style={{ width: `${item.percent}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">
                              {item.percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {product.colors?.palette && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Color Palette
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.palette.split(",").map((hex, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <div
                            className="w-12 h-12 rounded border border-gray-300"
                            style={{ backgroundColor: hex }}
                          ></div>
                          <span className="text-xs text-gray-600 font-mono">
                            {hex}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No color information available</p>
            )}
          </div>

          {/* Inventory / Variants */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Inventory</h3>
              {product.totalStock != null && (
                <span
                  className={`text-sm font-medium ${
                    product.isLowStock ? "text-red-600" : "text-gray-600"
                  }`}
                >
                  Total stock: {product.totalStock}
                  {product.isLowStock && " (low stock)"}
                </span>
              )}
            </div>

            {product.variants && product.variants.length > 0 ? (
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">Size</th>
                    <th className="pb-2">Color</th>
                    <th className="pb-2">Stock</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {product.variants.map((variant) => (
                    <tr key={variant._id}>
                      <td className="py-2 font-mono text-xs text-gray-500">
                        {variant.sku}
                      </td>
                      <td className="py-2">{variant.size || "—"}</td>
                      <td className="py-2">{variant.color || "—"}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          min="0"
                          defaultValue={variant.stock}
                          onBlur={(e) =>
                            handleVariantStockChange(
                              variant._id,
                              e.target.value,
                            )
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleDeleteVariant(variant._id)}
                          className="text-red-600 hover:text-red-900 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 mb-4">
                No size/color variants yet. Add one below to start tracking
                stock.
              </p>
            )}

            <form
              onSubmit={handleAddVariant}
              className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4"
            >
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Size
                </label>
                <input
                  type="text"
                  value={variantForm.size}
                  onChange={(e) =>
                    setVariantForm((prev) => ({
                      ...prev,
                      size: e.target.value,
                    }))
                  }
                  placeholder="M"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={variantForm.color}
                  onChange={(e) =>
                    setVariantForm((prev) => ({
                      ...prev,
                      color: e.target.value,
                    }))
                  }
                  placeholder="Red"
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={variantForm.stock}
                  onChange={(e) =>
                    setVariantForm((prev) => ({
                      ...prev,
                      stock: e.target.value,
                    }))
                  }
                  placeholder="0"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={savingVariant}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition"
              >
                {savingVariant ? "Adding..." : "Add Variant"}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
            <div className="mb-4">{getStatusBadge(product.status)}</div>
            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange("published")}
                disabled={product.status === "published"}
                className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Publish
              </button>
              <button
                onClick={() => handleStatusChange("draft")}
                disabled={product.status === "draft"}
                className="w-full px-4 py-2 bg-yellow-600 text-white font-medium rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Set as Draft
              </button>
              <button
                onClick={() => handleStatusChange("archived")}
                disabled={product.status === "archived"}
                className="w-full px-4 py-2 bg-gray-600 text-white font-medium rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Archive
              </button>
            </div>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Metadata
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Created</p>
                <p className="text-gray-900 font-medium">
                  {format(
                    new Date(product.metadata?.uploadedAt || product.createdAt),
                    "MMM d, yyyy HH:mm",
                  )}
                </p>
              </div>
              {product.metadata?.jobId && (
                <div>
                  <p className="text-gray-600">Job ID</p>
                  <p className="text-gray-900 font-mono text-xs">
                    {product.metadata.jobId}
                  </p>
                </div>
              )}
              {product.metadata?.tokens && (
                <div>
                  <p className="text-gray-600">AI Tokens Used</p>
                  <p className="text-gray-900 font-medium">
                    {product.metadata.tokens}
                  </p>
                </div>
              )}
              {product.updatedAt && (
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="text-gray-900 font-medium">
                    {format(new Date(product.updatedAt), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
