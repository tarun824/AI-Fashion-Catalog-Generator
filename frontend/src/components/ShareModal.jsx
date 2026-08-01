import { useState, useEffect, useRef } from "react";
import {
  X,
  Copy,
  Download,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import QRCode from "qrcode";

/**
 * ShareModal Component
 * Beautiful modal for sharing products with QR code, copy link, and WhatsApp share
 *
 * Props:
 * - isOpen: boolean - Whether modal is visible
 * - onClose: function - Callback when modal closes
 * - productName: string - Name of the product
 * - productSlug: string - Slug of the product
 * - productPrice: number - Price of the product
 */
export default function ShareModal({
  isOpen,
  onClose,
  productName,
  productSlug,
  productPrice,
}) {
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [showQR, setShowQR] = useState(false); // QR code is now collapsible
  const canvasRef = useRef(null);

  const shareUrl = `${window.location.origin}/products/${productSlug}`;

  // Generate QR code when user expands QR section
  useEffect(() => {
    if (showQR && !qrCodeDataUrl && productSlug) {
      generateQRCode();
    }
  }, [showQR, productSlug]);

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("Failed to copy link");
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `${productSlug}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `Check out this product:\n\n${productName}\n₹${productPrice}\n\n${shareUrl}`,
    );
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, "_blank");
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Check out ${productName} - ₹${productPrice}`,
          url: shareUrl,
        });
        onClose();
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-lg flex-shrink-0">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">Share Product</h3>
              <p className="text-xs text-blue-100 truncate">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition flex-shrink-0"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content - PRIMARY ACTIONS FIRST! */}
        <div className="p-4 space-y-3.5">
          {/* 1. PRIMARY: WhatsApp Share (BIGGEST, FIRST) */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl text-base"
          >
            <svg
              className="w-6 h-6 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <span>Share on WhatsApp</span>
          </button>

          {/* 2. SECONDARY ACTIONS - Copy Link & More */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center gap-1.5 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition border-2 border-blue-200 dark:border-blue-800 min-h-[85px]"
            >
              {copied ? (
                <>
                  <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    Link Copied!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Copy Link
                  </span>
                </>
              )}
            </button>

            {/* Toggle QR Code / More Options */}
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex flex-col items-center justify-center gap-1.5 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition border-2 border-gray-200 dark:border-gray-600 min-h-[85px]"
            >
              {showQR ? (
                <>
                  <ChevronUp className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Hide QR
                  </span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Show QR
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Product URL */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Product URL
            </p>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all leading-relaxed">
              {shareUrl}
            </p>
          </div>

          {/* Mobile Share (if available) */}
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition text-sm"
            >
              <Share2 className="w-4 h-4" />
              More Share Options
            </button>
          )}

          {/* 3. OPTIONAL: Collapsible QR Code (Hidden by default) */}
          {showQR && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top duration-300 space-y-2.5">
              {/* QR Code */}
              <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="w-40 h-40 sm:w-48 sm:h-48"
                  />
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-1.5"></div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Generating...
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Scan to view product
                </p>
              </div>

              {/* Download QR Button */}
              <button
                onClick={handleDownloadQR}
                disabled={!qrCodeDataUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed border border-purple-200 dark:border-purple-800 text-sm"
              >
                <Download className="w-4 h-4" />
                Download QR Code
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 Most customers prefer WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}
