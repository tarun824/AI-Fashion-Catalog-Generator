# Integration System - Dynamic Fields Guide

## Overview

The Integration model supports **dynamic fields** through the `data` field, allowing each integration to store custom configuration without modifying the schema.

## Architecture

```javascript
Integration Schema:
├── Standard Fields (all integrations)
│   ├── name, displayName, category
│   ├── status, credentials, token
│   └── stats, config, lastError
│
└── Dynamic Field: data (integration-specific)
    ├── Shiprocket: { lastAuthAt, apiBase, pickupAddresses, ... }
    ├── Razorpay: { merchantId, webhookSecret, settlements, ... }
    ├── WhatsApp: { phoneNumberId, templateIds, messageStats, ... }
    └── Custom: { any: "field", you: "need" }
```

---

## How Database Storage Works

### 1. **First Request (No Token)**

```
User makes API call
    ↓
Check in-memory cache → Empty
    ↓
Check database → No record
    ↓
Login with email/password → Get token
    ↓
Save to memory + database
    ↓
API call succeeds
```

### 2. **Subsequent Requests (Token in Memory)**

```
User makes API call
    ↓
Check in-memory cache → Token found! ✅
    ↓
Use cached token (no database query)
    ↓
API call succeeds
```

### 3. **After Server Restart (Token in Database)**

```
Server restarts → Memory cleared
    ↓
User makes API call
    ↓
Check in-memory cache → Empty
    ↓
Check database → Token found! ✅
    ↓
Load into memory
    ↓
API call succeeds (no re-authentication needed)
```

### 4. **Token Expired (Auto-Refresh)**

```
User makes API call
    ↓
Check in-memory cache → Token expired
    ↓
Check database → Token expired
    ↓
Login with email/password → Get new token
    ↓
Save to memory + database
    ↓
API call succeeds
```

**Result**: You only see "✓ Authenticated" when actually logging in, not on every request!

---

## Example: Shiprocket Integration

### Storing Dynamic Fields

```javascript
// backend/src/services/shiprocketService.js

// After authentication, save integration-specific data
await integration.updateData("lastAuthAt", new Date());
await integration.updateData("apiBase", this.baseURL);
await integration.updateData("pickupAddresses", [
  { name: "Primary", address: "123 Street..." },
]);

// Save complex objects
await integration.updateData("rateCache", {
  mumbai_delhi: { rate: 55, cachedAt: new Date() },
  delhi_bangalore: { rate: 75, cachedAt: new Date() },
});
```

### Retrieving Dynamic Fields

```javascript
// Get specific field
const lastAuth = integration.getData("lastAuthAt");
const apiBase = integration.getData("apiBase");

// Get with default value
const pickupAddresses = integration.getData("pickupAddresses", []);

// Access directly
const rateCache = integration.data.rateCache;
```

---

## Example: Razorpay Integration

### Setup

```javascript
// backend/src/services/razorpayService.js

import Razorpay from "razorpay";
import Integration from "../models/Integration.js";

class RazorpayService {
  async initialize() {
    // Get or create integration
    const integration = await Integration.getOrCreate(
      "razorpay",
      "Razorpay",
      "payment",
    );

    // Store Razorpay-specific config
    await integration.updateData("merchantId", process.env.RAZORPAY_KEY_ID);
    await integration.updateData("planIds", {
      basic: "plan_123",
      premium: "plan_456",
    });
    await integration.updateData("webhookEvents", [
      "payment.captured",
      "payment.failed",
      "subscription.charged",
    ]);

    await integration.activate();
  }

  async getPaymentStats() {
    const integration = await Integration.findOne({ name: "razorpay" });

    return {
      totalPayments: integration.getData("totalPayments", 0),
      successfulPayments: integration.getData("successfulPayments", 0),
      failedPayments: integration.getData("failedPayments", 0),
      totalRevenue: integration.getData("totalRevenue", 0),
      lastPaymentAt: integration.getData("lastPaymentAt"),
    };
  }

  async recordPayment(paymentId, amount, status) {
    const integration = await Integration.findOne({ name: "razorpay" });

    // Update dynamic stats
    const totalPayments = integration.getData("totalPayments", 0) + 1;
    await integration.updateData("totalPayments", totalPayments);

    if (status === "success") {
      const successful = integration.getData("successfulPayments", 0) + 1;
      const revenue = integration.getData("totalRevenue", 0) + amount;
      await integration.updateData("successfulPayments", successful);
      await integration.updateData("totalRevenue", revenue);
    }

    await integration.updateData("lastPaymentId", paymentId);
    await integration.updateData("lastPaymentAt", new Date());

    await integration.recordSuccess();
  }
}
```

---

## Example: WhatsApp Business Integration

```javascript
// backend/src/services/whatsappService.js

import Integration from "../models/Integration.js";

class WhatsAppService {
  async sendOrderNotification(orderId, phone, message) {
    const integration = await Integration.findOne({ name: "whatsapp" });

    // Send message via WhatsApp API
    const result = await this.sendMessage(phone, message);

    // Track in dynamic fields
    const sentMessages = integration.getData("messagesSent", 0) + 1;
    const orderNotifications = integration.getData("orderNotifications", 0) + 1;

    await integration.updateData("messagesSent", sentMessages);
    await integration.updateData("orderNotifications", orderNotifications);
    await integration.updateData("lastMessageSentAt", new Date());

    // Store message history (last 100)
    const history = integration.getData("messageHistory", []);
    history.unshift({
      orderId,
      phone: phone.replace(/\d(?=\d{4})/g, "*"), // Mask phone
      sentAt: new Date(),
      status: result.status,
    });

    await integration.updateData("messageHistory", history.slice(0, 100));

    await integration.recordSuccess();
  }

  async getMessagingStats() {
    const integration = await Integration.findOne({ name: "whatsapp" });

    return {
      messagesSent: integration.getData("messagesSent", 0),
      orderNotifications: integration.getData("orderNotifications", 0),
      deliveryUpdates: integration.getData("deliveryUpdates", 0),
      supportMessages: integration.getData("supportMessages", 0),
      lastMessageSentAt: integration.getData("lastMessageSentAt"),
      recentMessages: integration.getData("messageHistory", []).slice(0, 10),
    };
  }
}
```

---

## Example: Amazon Seller Integration

```javascript
// backend/src/services/amazonService.js

import Integration from "../models/Integration.js";

class AmazonService {
  async syncProduct(product) {
    const integration = await Integration.findOne({ name: "amazon" });

    // Push product to Amazon
    const result = await this.pushToAmazon(product);

    // Track synced products in dynamic field
    const syncedProducts = integration.getData("syncedProducts", {});
    syncedProducts[product._id] = {
      asin: result.asin,
      sku: result.sku,
      syncedAt: new Date(),
      status: result.status,
    };

    await integration.updateData("syncedProducts", syncedProducts);
    await integration.updateData("lastSyncAt", new Date());

    // Track sync stats
    const totalSyncs = integration.getData("totalProductSyncs", 0) + 1;
    await integration.updateData("totalProductSyncs", totalSyncs);

    await integration.recordSuccess();
  }

  async getAmazonInventory() {
    const integration = await Integration.findOne({ name: "amazon" });
    const syncedProducts = integration.getData("syncedProducts", {});

    return Object.entries(syncedProducts).map(([productId, data]) => ({
      productId,
      asin: data.asin,
      sku: data.sku,
      syncedAt: data.syncedAt,
      status: data.status,
    }));
  }
}
```

---

## Benefits of Dynamic Fields

### ✅ **Scalability**

- Add new integrations without schema changes
- No migrations needed for new fields
- Each integration has custom storage

### ✅ **Flexibility**

```javascript
// Shiprocket stores this:
data: {
  lastAuthAt: Date,
  apiBase: String,
  pickupAddresses: Array,
  rateCache: Object
}

// Razorpay stores this:
data: {
  totalPayments: Number,
  totalRevenue: Number,
  lastPaymentId: String,
  planIds: Object
}

// Same model, different data!
```

### ✅ **No Code Changes for New Fields**

```javascript
// Week 1: Store basic data
await integration.updateData("feature1", "value1");

// Week 2: Add more data without deployment
await integration.updateData("feature2", "value2");
await integration.updateData("newMetric", 123);

// Week 3: Store complex objects
await integration.updateData("advancedConfig", {
  nested: { data: "works" },
});
```

---

## API Usage Examples

### Get Integration with Dynamic Data

```javascript
// GET /api/admin/integrations/shiprocket
{
  "success": true,
  "integration": {
    "name": "shiprocket",
    "status": "active",
    "stats": {
      "totalRequests": 150,
      "successfulRequests": 148,
      "failedRequests": 2
    },
    "data": {  // 🔥 Dynamic fields
      "lastAuthAt": "2026-07-26T10:30:00Z",
      "apiBase": "https://apiv2.shiprocket.in/v1/external",
      "pickupAddresses": [ /* ... */ ],
      "rateCache": { /* ... */ }
    }
  }
}
```

### Update Dynamic Fields

```javascript
// PATCH /api/admin/integrations/shiprocket
{
  "data": {
    "customField": "custom value",
    "anotherField": 12345,
    "nestedObject": {
      "works": "perfectly"
    }
  }
}
```

---

## Best Practices

### 1. **Namespace Your Fields**

```javascript
// ✅ GOOD - Clear ownership
await integration.updateData("shiprocket_pickupAddress", address);
await integration.updateData("shiprocket_defaultCourier", courierId);

// ❌ AVOID - Generic names
await integration.updateData("address", address);
await integration.updateData("default", courierId);
```

### 2. **Document Dynamic Fields**

```javascript
/**
 * Shiprocket Dynamic Fields:
 * - lastAuthAt: Date of last authentication
 * - apiBase: API base URL
 * - pickupAddresses: Array of pickup locations
 * - rateCache: Cached courier rates { origin_dest: { rate, cachedAt } }
 * - defaultCourierId: Default courier company ID
 */
```

### 3. **Use Helper Methods**

```javascript
class ShiprocketService {
  async getPickupAddresses() {
    const integration = await Integration.findOne({ name: "shiprocket" });
    return integration.getData("pickupAddresses", []);
  }

  async addPickupAddress(address) {
    const integration = await Integration.findOne({ name: "shiprocket" });
    const addresses = integration.getData("pickupAddresses", []);
    addresses.push(address);
    await integration.updateData("pickupAddresses", addresses);
  }
}
```

### 4. **Handle Missing Fields Gracefully**

```javascript
// ✅ GOOD - Provide defaults
const value = integration.getData("mayNotExist", "default");

// ❌ AVOID - Throws if field doesn't exist
const value = integration.data.mayNotExist.nestedField;
```

---

## Testing

```javascript
// Example test
import Integration from "../models/Integration.js";

describe("Integration Dynamic Fields", () => {
  it("should store and retrieve custom data", async () => {
    const integration = await Integration.create({
      name: "test",
      displayName: "Test",
      category: "other",
    });

    // Store data
    await integration.updateData("customField", "value");
    await integration.updateData("numberField", 42);
    await integration.updateData("objectField", { nested: true });

    // Retrieve data
    expect(integration.getData("customField")).toBe("value");
    expect(integration.getData("numberField")).toBe(42);
    expect(integration.getData("objectField")).toEqual({ nested: true });
    expect(integration.getData("nonExistent", "default")).toBe("default");
  });
});
```

---

## Summary

**Dynamic fields make the Integration model infinitely extensible without schema changes!**

Each integration can store:

- Custom configuration
- Service-specific stats
- Cached data
- Historical records
- Any JSON-serializable data

**Perfect for scaling to 10+ integrations without code changes!** 🚀
