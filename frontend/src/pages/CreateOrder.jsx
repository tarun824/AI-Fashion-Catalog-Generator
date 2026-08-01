import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";
import CustomerSelector from "../components/CustomerSelector";

export default function CreateOrder() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form State
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
  });

  const [items, setItems] = useState([]);
  const [pricing, setPricing] = useState({
    discount: 0,
    tax: 0,
    shippingCharge: 0,
  });

  const [payment, setPayment] = useState({
    method: "COD",
    status: "pending",
  });

  const [shipping, setShipping] = useState({
    courier: "",
    trackingNumber: "",
  });

  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Handle customer selection from dropdown
  const handleCustomerSelect = (selectedCust) => {
    setSelectedCustomer(selectedCust);

    if (selectedCust) {
      // Auto-fill customer form with selected customer data
      setCustomer({
        name: selectedCust.name || "",
        phone: selectedCust.phone || "",
        email: selectedCust.email || "",
        address: {
          line1: selectedCust.address?.line1 || "",
          line2: selectedCust.address?.line2 || "",
          city: selectedCust.address?.city || "",
          state: selectedCust.address?.state || "",
          pincode: selectedCust.address?.pincode || "",
          country: selectedCust.address?.country || "India",
        },
      });
    } else {
      // Reset to empty form for new customer
      setCustomer({
        name: "",
        phone: "",
        email: "",
        address: {
          line1: "",
          line2: "",
          city: "",
          state: "",
          pincode: "",
          country: "India",
        },
      });
    }
  };

  // Search products
  const searchProducts = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(
        `/admin/products?search=${encodeURIComponent(query)}&limit=10`,
      );
      setSearchResults(response.data || []);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const addItem = (product) => {
    const existingItem = items.find((item) => item.sku === product.sku);

    if (existingItem) {
      setItems(
        items.map((item) =>
          item.sku === product.sku
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setItems([
        ...items,
        {
          productId: product._id,
          sku: product.sku,
          name: product.name,
          price: product.pricing?.mrp || product.pricing?.salePrice || 0,
          quantity: 1,
          image: product.images?.thumbnail || null,
        },
      ]);
    }

    setSearchTerm("");
    setSearchResults([]);
  };

  const addManualItem = () => {
    setItems([
      ...items,
      {
        sku: "",
        name: "",
        price: 0,
        quantity: 1,
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.price || 0);
    }, 0);

    const total =
      subtotal +
      (parseFloat(pricing.tax) || 0) +
      (parseFloat(pricing.shippingCharge) || 0) -
      (parseFloat(pricing.discount) || 0);

    return { subtotal, total };
  };

  const { subtotal, total } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!customer.name || !customer.phone) {
      alert("Customer name and phone are required");
      return;
    }

    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    for (const item of items) {
      if (!item.sku || !item.name || !item.quantity || !item.price) {
        alert("All item fields (SKU, name, quantity, price) are required");
        return;
      }
    }

    setSubmitting(true);

    try {
      const orderData = {
        customer,
        items,
        pricing: {
          subtotal,
          discount: parseFloat(pricing.discount) || 0,
          tax: parseFloat(pricing.tax) || 0,
          shippingCharge: parseFloat(pricing.shippingCharge) || 0,
          total,
        },
        payment,
        shipping,
        source,
        notes,
        internalNotes,
      };

      const response = await api.post("/admin/orders", orderData);
      navigate(`/admin/orders/${response.data._id}`);
    } catch (err) {
      alert("Failed to create order: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/admin/orders"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Back to Orders
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manually create an order for phone/WhatsApp enquiries
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Customer Information
          </h2>

          {/* Customer Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Customer
            </label>
            <CustomerSelector
              onSelect={handleCustomerSelect}
              selectedCustomer={selectedCustomer}
            />
          </div>

          {/* Customer Form Fields */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {selectedCustomer
                ? "Review and edit customer details if needed:"
                : "Enter new customer details:"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) =>
                    setCustomer({ ...customer, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={customer.address.line1}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      address: { ...customer.address, line1: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={customer.address.line2}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      address: { ...customer.address, line2: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={customer.address.city}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      address: { ...customer.address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={customer.address.state}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      address: { ...customer.address, state: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={customer.address.pincode}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      address: { ...customer.address, pincode: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={customer.address.country}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      address: { ...customer.address, country: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Order Items
          </h2>

          {/* Product Search */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Products
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by SKU or product name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => addItem(product)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.sku}</div>
                    </div>
                    <div className="text-sm font-medium">
                      ₹{product.pricing?.mrp || product.pricing?.salePrice || 0}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items List */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No items added yet</p>
            </div>
          ) : (
            <div className="space-y-4 mb-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded"
                >
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500">SKU</label>
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => updateItem(index, "sku", e.target.value)}
                      required
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-xs text-gray-500">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        updateItem(index, "name", e.target.value)
                      }
                      required
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Qty</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      min="1"
                      required
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Price</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "price",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addManualItem}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add Manual Item
          </button>

          {/* Pricing */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Discount:</span>
                  <input
                    type="number"
                    value={pricing.discount}
                    onChange={(e) =>
                      setPricing({ ...pricing, discount: e.target.value })
                    }
                    step="0.01"
                    min="0"
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Tax:</span>
                  <input
                    type="number"
                    value={pricing.tax}
                    onChange={(e) =>
                      setPricing({ ...pricing, tax: e.target.value })
                    }
                    step="0.01"
                    min="0"
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Shipping:</span>
                  <input
                    type="number"
                    value={pricing.shippingCharge}
                    onChange={(e) =>
                      setPricing({ ...pricing, shippingCharge: e.target.value })
                    }
                    step="0.01"
                    min="0"
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                  />
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Payment
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={payment.method}
                  onChange={(e) =>
                    setPayment({ ...payment, method: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="COD">Cash on Delivery</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="WhatsApp">WhatsApp Payment</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={payment.status}
                  onChange={(e) =>
                    setPayment({ ...payment, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">Manual Entry</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone Call</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Link
            to="/admin/orders"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? "Creating Order..." : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
