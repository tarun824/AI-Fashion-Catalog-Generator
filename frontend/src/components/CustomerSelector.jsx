/**
 * Customer Selector Component
 * Search and select existing customers with autocomplete
 */

import { useState, useEffect, useRef } from "react";
import { Search, User, Phone, Mail, X, Plus } from "lucide-react";
import { api } from "../utils/api";

export default function CustomerSelector({ onSelect, selectedCustomer }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch customers based on search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCustomers(searchQuery);
      } else {
        fetchRecentCustomers();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchCustomers = async (query) => {
    setLoading(true);
    try {
      const response = await api.get(
        `/admin/customers?search=${encodeURIComponent(query)}&limit=10`,
      );
      setCustomers(response.customers || []);
    } catch (err) {
      console.error("Failed to search customers:", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        "/admin/customers?limit=10&sortBy=createdAt&order=desc",
      );
      setCustomers(response.customers || []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    onSelect(customer);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClearSelection = () => {
    onSelect(null);
    setSearchQuery("");
  };

  const handleCreateNew = () => {
    onSelect(null);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Customer Display */}
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedCustomer.name}
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedCustomer.phone}
                </span>
                {selectedCustomer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedCustomer.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition"
            title="Clear selection"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      ) : (
        <>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                setIsOpen(true);
                if (!searchQuery && customers.length === 0) {
                  fetchRecentCustomers();
                }
              }}
              placeholder="Search existing customer by name, phone, or email..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition"
            />
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {/* Create New Option */}
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-200 dark:border-gray-700 transition"
              >
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Create New Customer
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter customer details manually below
                  </p>
                </div>
              </button>

              {/* Loading State */}
              {loading && (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading customers...
                </div>
              )}

              {/* No Results */}
              {!loading && customers.length === 0 && searchQuery && (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No customers found</p>
                  <p className="text-sm mt-1">
                    Try a different search or create a new customer
                  </p>
                </div>
              )}

              {/* Customer List */}
              {!loading && customers.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {searchQuery
                        ? `${customers.length} customer(s) found`
                        : "Recent Customers"}
                    </p>
                  </div>
                  {customers.map((customer) => (
                    <button
                      key={customer._id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {customer.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                          {customer.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </span>
                          )}
                        </div>
                        {customer.totalSpent > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {customer.totalOrders || 0} orders · ₹
                            {customer.totalSpent?.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
