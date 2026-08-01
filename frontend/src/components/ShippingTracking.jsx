/**
 * Shipping Tracking Component
 * Beautiful visual timeline showing shipment journey
 */

import { useState, useEffect } from "react";
import {
  Package,
  Truck,
  CheckCircle,
  MapPin,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { api } from "../utils/api";

export default function ShippingTracking({ order, refreshTrigger = 0 }) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (order.shipping?.awbCode) {
      loadTracking();
    }
  }, [order._id, refreshTrigger]);

  const loadTracking = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/admin/shipping/track/${order._id}`);
      setTracking(response.data.tracking);
    } catch (error) {
      setError("Unable to fetch tracking info");
      console.error("Tracking error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!order.shipping?.awbCode) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Shipment not yet created</p>
      </div>
    );
  }

  if (loading && !tracking) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-600">Loading tracking information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-red-800 font-medium">Tracking Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadTracking}
            className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    if (status?.toLowerCase().includes("delivered")) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
    if (
      status?.toLowerCase().includes("transit") ||
      status?.toLowerCase().includes("out")
    ) {
      return <Truck className="w-6 h-6 text-blue-600" />;
    }
    return <Package className="w-6 h-6 text-orange-600" />;
  };

  const getStatusColor = (status) => {
    if (status?.toLowerCase().includes("delivered")) return "green";
    if (status?.toLowerCase().includes("transit")) return "blue";
    if (status?.toLowerCase().includes("picked")) return "purple";
    return "gray";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Shipment Tracking</h3>
            <p className="text-blue-100 text-sm mt-1">
              {tracking?.courierName || order.shipping.courierName}
            </p>
          </div>
          <button
            onClick={loadTracking}
            disabled={loading}
            className="p-2 hover:bg-white/20 rounded-lg transition disabled:opacity-50"
            title="Refresh tracking"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* AWB Badge */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 inline-block">
          <p className="text-xs text-blue-100 mb-1">Tracking Number</p>
          <p className="font-mono font-bold text-lg">
            {tracking?.awbCode || order.shipping.awbCode}
          </p>
        </div>
      </div>

      {/* Current Status */}
      {tracking && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full bg-${getStatusColor(tracking.currentStatus)}-100`}
            >
              {getStatusIcon(tracking.currentStatus)}
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900 mb-1">
                {tracking.currentStatus || tracking.shipmentStatus}
              </h4>
              {tracking.estimatedDeliveryDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Estimated Delivery:{" "}
                    <span className="font-medium">
                      {new Date(
                        tracking.estimatedDeliveryDate,
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                </div>
              )}
              {tracking.deliveredDate && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Delivered on{" "}
                    <span className="font-medium">
                      {new Date(tracking.deliveredDate).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tracking Timeline */}
      {tracking?.scans && tracking.scans.length > 0 && (
        <div className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Shipment Journey</h4>
          <div className="space-y-4">
            {tracking.scans.map((scan, index) => {
              const isLatest = index === 0;
              return (
                <div key={index} className="relative pl-8">
                  {/* Timeline line */}
                  {index < tracking.scans.length - 1 && (
                    <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
                  )}

                  {/* Timeline dot */}
                  <div
                    className={`
                    absolute left-0 top-1 w-4 h-4 rounded-full
                    ${isLatest ? "bg-blue-600 ring-4 ring-blue-100" : "bg-gray-300"}
                  `}
                  />

                  {/* Content */}
                  <div
                    className={`
                    pb-4
                    ${isLatest ? "text-blue-900" : "text-gray-600"}
                  `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p
                          className={`font-medium ${isLatest ? "text-blue-900" : "text-gray-900"}`}
                        >
                          {scan.activity}
                        </p>
                        {scan.location && (
                          <div className="flex items-center gap-1 text-sm mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{scan.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm whitespace-nowrap">
                        <div className="font-medium">
                          {new Date(scan.date).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-gray-500">
                          {new Date(scan.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{tracking?.origin || "Origin"}</span>
          {" → "}
          <span className="font-medium">
            {tracking?.destination || "Destination"}
          </span>
        </div>
        {tracking?.awbCode && (
          <a
            href={`https://shiprocket.co/tracking/${tracking.awbCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            Track on Shiprocket
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
