import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/admin/customers/${id}`);
      setCustomer(response.data.customer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsAddingNote(true);
    try {
      await api.post(`/admin/customers/${id}/notes`, { text: noteText });
      setNoteText("");
      loadCustomer();
    } catch (err) {
      alert("Failed to add note: " + err.message);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Delete this note?")) return;

    try {
      await api.delete(`/admin/customers/${id}/notes/${noteId}`);
      loadCustomer();
    } catch (err) {
      alert("Failed to delete note: " + err.message);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await api.post(`/admin/customers/${id}/analyze`);
      loadCustomer();
      alert("Customer analyzed successfully!");
    } catch (err) {
      alert("Failed to analyze customer: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading customer details...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || "Customer not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate("/admin/customers")}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Customers
          </button>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <div className="text-gray-500">{customer.phone}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isAnalyzing ? "Analyzing..." : "🤖 Analyze"}
          </button>
          <Link
            to={`/admin/customers/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit Customer
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="font-medium">{customer.phone}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">
                  {customer.email || "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Customer Type</div>
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      customer.customerType === "vip"
                        ? "bg-purple-100 text-purple-800"
                        : customer.customerType === "regular"
                          ? "bg-blue-100 text-blue-800"
                          : customer.customerType === "new"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {customer.customerType.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Source</div>
                <div className="font-medium capitalize">{customer.source}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Customer Since</div>
                <div className="font-medium">
                  {formatDate(customer.customerSince)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Last Purchase</div>
                <div className="font-medium">
                  {formatDate(customer.lastPurchaseDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Purchase Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {customer.totalOrders}
                </div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(customer.totalSpent)}
                </div>
                <div className="text-sm text-gray-600">Total Spent</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {formatCurrency(customer.averageOrderValue)}
                </div>
                <div className="text-sm text-gray-600">Avg Order Value</div>
              </div>
            </div>
          </div>

          {/* AI Intelligence */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">AI Intelligence</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Lifetime Value</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(customer.intelligence?.lifetimeValue || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Churn Risk</div>
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      customer.intelligence?.churnRisk === "high"
                        ? "bg-red-100 text-red-800"
                        : customer.intelligence?.churnRisk === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {(customer.intelligence?.churnRisk || "low").toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Engagement Score</div>
                <div className="text-xl font-bold">
                  {customer.intelligence?.engagementScore || 0}/100
                </div>
              </div>
            </div>
            {customer.intelligence?.lastAnalyzedAt && (
              <div className="text-xs text-gray-500 mt-4">
                Last analyzed:{" "}
                {formatDate(customer.intelligence.lastAnalyzedAt)}
              </div>
            )}
          </div>

          {/* Addresses */}
          {customer.addresses && customer.addresses.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Addresses</h2>
              <div className="space-y-3">
                {customer.addresses.map((address, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{address.label}</div>
                        <div className="text-sm text-gray-600">
                          {address.street}
                        </div>
                        <div className="text-sm text-gray-600">
                          {address.city}, {address.state} {address.pincode}
                        </div>
                        <div className="text-sm text-gray-600">
                          {address.country}
                        </div>
                      </div>
                      {address.isDefault && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Notes</h2>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="mb-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note about this customer..."
                rows={3}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isAddingNote || !noteText.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isAddingNote ? "Adding..." : "Add Note"}
              </button>
            </form>

            {/* Notes List */}
            <div className="space-y-3">
              {customer.notes && customer.notes.length > 0 ? (
                customer.notes.map((note) => (
                  <div
                    key={note._id}
                    className="border-l-4 border-blue-500 pl-4 py-2"
                  >
                    <div className="text-sm text-gray-700">{note.text}</div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500">
                        {formatDate(note.addedAt)}
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm">No notes yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Tags */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {customer.tags && customer.tags.length > 0 ? (
                customer.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <div className="text-gray-500 text-sm">No tags</div>
              )}
            </div>
          </div>

          {/* Preferences */}
          {customer.preferences && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-3">Preferences</h3>
              <div className="space-y-3 text-sm">
                {customer.preferences.preferredFabrics?.length > 0 && (
                  <div>
                    <div className="text-gray-500">Preferred Fabrics</div>
                    <div className="font-medium">
                      {customer.preferences.preferredFabrics.join(", ")}
                    </div>
                  </div>
                )}
                {customer.preferences.preferredOccasions?.length > 0 && (
                  <div>
                    <div className="text-gray-500">Preferred Occasions</div>
                    <div className="font-medium">
                      {customer.preferences.preferredOccasions.join(", ")}
                    </div>
                  </div>
                )}
                {customer.preferences.preferredColors?.length > 0 && (
                  <div>
                    <div className="text-gray-500">Preferred Colors</div>
                    <div className="font-medium">
                      {customer.preferences.preferredColors.join(", ")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Communication */}
          {customer.communication && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-3">Communication</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">WhatsApp</span>
                  <span
                    className={
                      customer.communication.whatsappOptIn
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {customer.communication.whatsappOptIn
                      ? "✓ Opt-in"
                      : "✗ Opt-out"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span
                    className={
                      customer.communication.emailOptIn
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {customer.communication.emailOptIn
                      ? "✓ Opt-in"
                      : "✗ Opt-out"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SMS</span>
                  <span
                    className={
                      customer.communication.smsOptIn
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {customer.communication.smsOptIn ? "✓ Opt-in" : "✗ Opt-out"}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-gray-500">Preferred Method</div>
                  <div className="font-medium capitalize">
                    {customer.communication.preferredMethod || "Not set"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Behavior */}
          {customer.behavior && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-3">Behavior</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Products Viewed</span>
                  <span className="font-medium">
                    {customer.behavior.productsViewed || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cart Abandonments</span>
                  <span className="font-medium">
                    {customer.behavior.cartAbandonments || 0}
                  </span>
                </div>
                {customer.behavior.lastSeenAt && (
                  <div className="pt-2 border-t">
                    <div className="text-gray-500">Last Seen</div>
                    <div className="font-medium">
                      {formatDate(customer.behavior.lastSeenAt)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
