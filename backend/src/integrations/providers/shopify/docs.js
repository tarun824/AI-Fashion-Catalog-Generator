/**
 * In-app user guide for the Shopify provider.
 * Describes what ShopifyProvider.js actually does (Admin REST API, static access token).
 * Sources: shopify.dev / help.shopify.com (see `links`). Items we could not confirm are in `unverified`.
 */
export default {
  providerId: "shopify",
  title: "Shopify",
  tagline: "Import Shopify orders and send Shiprocket tracking back to your store.",

  overview:
    "This connection lets you pull orders from your Shopify store into your dashboard and, after you ship them (for example with Shiprocket), send the courier name and tracking number back to Shopify. Shopify then marks the order as fulfilled and emails your customer the tracking link. " +
    "It uses your own store's Shopify Admin API with a private access token that only you control. It does NOT publish products, change prices or change stock in Shopify; it only reads orders and creates fulfillments.",

  howItWorks: [
    {
      title: "Customer orders on your Shopify store",
      body: "Your customer checks out on your Shopify website as usual and pays through Shopify Payments or another payment gateway. Nothing changes on the Shopify side.",
    },
    {
      title: "You click Fetch orders",
      body: "On the Integrations page, open Shopify and click Fetch orders. The app asks Shopify for orders changed in the date range you choose (about the last 30 days if you do not choose one). Orders are not imported automatically in the background by this connection; you press the button.",
    },
    {
      title: "Orders appear in Orders",
      body: "Each Shopify order is saved once (re-fetching never creates duplicates). Customer name, phone, address, items, SKU, price and payment type are copied. Payment is marked COD only if the order's payment gateway, tags or note attributes mention cash on delivery; otherwise it is marked Prepaid, so check COD orders yourself.",
    },
    {
      title: "Ship the order via Shiprocket",
      body: "Open the order and create the shipment with Shiprocket yourself (manual step). Shiprocket gives you the courier name and the AWB (tracking) number.",
    },
    {
      title: "Send tracking to Shopify",
      body: "On the order, use the Shopify shipment confirmation button. The app finds the order's open fulfillment in Shopify and creates a fulfillment with the courier name and AWB. Shopify marks the items as fulfilled and emails the customer.",
    },
    {
      title: "You get paid by Shopify",
      body: "Customer payments are collected and paid out by Shopify Payments or your payment gateway, and COD money comes through your courier and Shiprocket. This app does not move money or reconcile payouts.",
    },
  ],

  capabilities: [
    {
      label: "Fetch orders",
      button: "Fetch orders",
      description:
        "Reads orders from Shopify (all statuses) updated since your chosen date, 50 at a time, and follows Shopify's next-page link until done. Skips orders with no items.",
    },
    {
      label: "Shipment confirmation (fulfillment + tracking)",
      button: "Confirm shipment / Send tracking",
      description:
        "Creates a Shopify fulfillment for all open fulfillment orders of that order, with courier name and AWB, and asks Shopify to email the customer.",
    },
    {
      label: "Test connection",
      button: "Test connection",
      description: "Calls your store's shop details to check that the domain and token work, and shows your store name.",
    },
  ],

  limitations: [
    "Products are not published to Shopify. Publishing products, updating stock and updating prices are all switched OFF for this connection.",
    "Only orders from the last 60 days are visible to Shopify apps unless your app also has the read_all_orders permission, which Shopify must approve for it. Older orders will not be fetched.",
    "Fetching is manual (button). New Shopify orders do not arrive on their own.",
    "Tracking is sent as a full fulfillment of all open items. Partial shipments of some items only are not supported, and the customer is always emailed (notify_customer is always on).",
    "The courier name must match a carrier name Shopify recognises (capitalisation matters) for Shopify to show a tracking link; otherwise the order is still fulfilled but the link may not be clickable.",
    "Order status in the app is simple: cancelled if Shopify says cancelled, shipped if Shopify says fulfilled or partially fulfilled, otherwise new. Delivered is not detected.",
    "Payment type (COD or Prepaid) is a best guess from gateway name, tags and note attributes. Always double check COD orders.",
    "Order items need a SKU in Shopify (Products > the product > Inventory > SKU) to match your catalogue; items without SKU are imported with a warning.",
    "Shopify allows about 2 requests per second on normal plans (4 on Advanced, 20 on Plus). Very large fetches are slowed and retried automatically.",
    "Shopify now calls the REST Admin API this app uses 'legacy' (since October 2024). It still works, but Shopify may change it in future.",
    "Since 1 January 2026 Shopify no longer lets you create new 'custom apps' from the store admin. This connection needs a permanent access token (starts with shpat_), which only those older admin-created custom apps show. See the Setup section and the Unverified list.",
    "Shopify hides customer name, address and phone unless your app is allowed to use 'protected customer data'. Without it, orders may come back with missing address or an error.",
  ],

  prerequisites: [
    { text: "A Shopify store you own, with your store's admin login (store owner or staff with permission to develop apps)." },
    { text: "Your store's permanent web address ending in .myshopify.com", link: "https://help.shopify.com/en/manual/domains" },
    {
      text: "A Shopify custom app with an Admin API access token (starts with shpat_). See Setup below.",
      link: "https://shopify.dev/docs/apps/build/authentication-authorization/legacy/admin-custom-apps",
    },
    { text: "A Shiprocket account to actually ship the orders (this connection only reports tracking back)." },
  ],

  setup: [
    {
      title: "1. Find your .myshopify.com address",
      steps: [
        "Log in to your Shopify admin (yourstore.myshopify.com/admin or via shopify.com/login).",
        "Look at the browser address bar. The part like my-store.myshopify.com is your shop domain. Your public website name (e.g. www.mybrand.in) will NOT work here.",
        "Copy only the my-store.myshopify.com part.",
      ],
      note: "You can also paste it with https:// in front; the app strips that.",
    },
    {
      title: "2. Open the custom app area",
      steps: [
        "In Shopify admin click Settings (bottom left).",
        "Click Apps and sales channels.",
        "Click Develop apps (top right).",
        "If you see a button 'Allow custom app development', click it and confirm. Shopify only shows this to the store owner or staff with the right permission.",
      ],
      link: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
      note: "If you do not see Develop apps or cannot create an app, see the 'Cannot create custom app' item in Troubleshooting.",
    },
    {
      title: "3. Create the app",
      steps: [
        "Click Create an app.",
        "Name it something clear, for example 'Order Sync'.",
        "Click Create app.",
      ],
      note: "Shopify says new admin-created custom apps can no longer be created (since 2026). If your store already has such an app, use it. If not, see Troubleshooting.",
    },
    {
      title: "4. Choose the Admin API permissions (scopes)",
      steps: [
        "In your app, open the Configuration tab.",
        "Under Admin API integration click Configure.",
        "Tick read_orders (needed to fetch orders).",
        "Tick read_merchant_managed_fulfillment_orders and write_merchant_managed_fulfillment_orders (needed to send tracking for orders you ship yourself). If you use a third-party fulfilment service for some products, also tick the matching third_party_fulfillment_orders (read and write) options.",
        "Optional: tick read_all_orders only if you need orders older than 60 days. Shopify may need to approve this.",
        "Do not tick anything else. Products and inventory permissions are not needed.",
        "Click Save.",
      ],
      note: "Shopify's search box in the scope list helps you find each name.",
    },
    {
      title: "5. Install the app on your store",
      steps: [
        "Click the API credentials tab (or the Install app button at the top right).",
        "Click Install app and confirm Install.",
      ],
    },
    {
      title: "6. Reveal and copy the Admin API access token",
      steps: [
        "On the API credentials tab, under Admin API access token click Reveal token once.",
        "Click the copy icon and paste the token into a safe place right away. It starts with shpat_.",
        "Shopify will NOT show it again. If you lose it you have to uninstall and reinstall the app to get a new one.",
      ],
      note: "Do not copy the API key or API secret key shown on the same page; those are different and will not work.",
    },
    {
      title: "7. Save the credentials in this app",
      steps: [
        "Go to Integrations and open Shopify.",
        "Paste Shop domain and Admin API access token. Leave API version empty unless support tells you otherwise.",
        "Click Save, then Test connection. You should see 'Connected to Shopify store \"Your store name\"'.",
      ],
    },
  ],

  fields: {
    shopDomain: {
      label: "Shop domain",
      summary: "The permanent .myshopify.com address of your store. Not your own website name.",
      whereToFind: [
        "Log in to Shopify admin.",
        "Look at the address bar: it shows my-store.myshopify.com/admin.",
        "Copy the my-store.myshopify.com part.",
      ],
      example: "my-store.myshopify.com",
      format: "yourstorename.myshopify.com, no spaces. https:// and a trailing slash are removed automatically.",
      link: "https://help.shopify.com/en/manual/domains",
      tips: [
        "Using your custom domain such as www.mybrand.in will fail with a not-found error.",
        "If you renamed your store, the old .myshopify.com address may stop working; copy the current one from Settings > Domains.",
      ],
      required: true,
    },
    accessToken: {
      label: "Admin API access token",
      summary: "A secret password that lets this app read your orders and create fulfillments. It starts with shpat_.",
      whereToFind: [
        "Shopify admin > Settings > Apps and sales channels > Develop apps.",
        "Click your app > API credentials tab.",
        "Under Admin API access token click Reveal token once and copy it.",
      ],
      example: "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      format: "Starts with shpat_ followed by letters and numbers. Not the API key and not the API secret key.",
      link: "https://shopify.dev/docs/apps/build/authentication-authorization/legacy/admin-custom-apps",
      tips: [
        "Paste it exactly, with no spaces or line breaks at the ends.",
        "Only the last 4 characters are shown here after saving. To change it, paste the new token again.",
        "The token must belong to the same store as the shop domain.",
      ],
      warning:
        "Shopify shows this token only ONCE. Copy it immediately and keep it safe. If you lose it, uninstall and reinstall the app in Shopify to get a new one.",
      required: true,
    },
    apiVersion: {
      label: "API version",
      summary: "Which dated version of Shopify's API to talk to. Leave it empty for the default.",
      whereToFind: [
        "You normally do not need to find this; leave the field empty.",
        "Only if support asks you to change it: versions are named year-month, such as 2025-10.",
      ],
      example: "2025-10",
      format: "YYYY-MM using January, April, July or October (04, 07, 10, 01).",
      link: "https://shopify.dev/docs/api/usage/versioning",
      tips: [
        "Shopify releases a new version every quarter and supports each for at least 12 months.",
        "If a version is too old, Shopify automatically answers using the oldest supported one, so things may still work but behave differently.",
        "A made-up version that Shopify does not know can cause a not-found error.",
      ],
      required: false,
    },
  },

  security: [
    "Your access token is stored encrypted in our database (AES-256-GCM). It is never shown again after saving; you only see the last 4 characters.",
    "The token is sent only to your own Shopify store (https://<your-shop>.myshopify.com) and is never put in logs; technical call logs have secrets masked.",
    "Give the app only the permissions it needs (read orders, and fulfillment permissions). Never tick products, customers, payments or settings write permissions for this connection.",
    "To stop access at any time: in Shopify admin go to Settings > Apps and sales channels > Develop apps > your app and uninstall the app (or delete the app). The token stops working immediately.",
    "To rotate the token: Shopify does not let you rotate an admin-created custom app's keys. Uninstall the app, install it again, reveal the new token once, and paste it here.",
    "To remove the connection from our side: open Integrations > Shopify and remove or replace the saved credentials.",
    "Never share your token in chat, email or screenshots. If it leaks, uninstall the app in Shopify first, then create a fresh token.",
    "Order data includes customer addresses and phone numbers. Only admins of your account can see it.",
  ],

  usage: [
    {
      title: "Check the connection",
      steps: ["Go to Integrations > Shopify.", "Click Test connection.", "You should see your store name. If not, see Troubleshooting."],
    },
    {
      title: "Fetch new orders",
      steps: [
        "Go to Integrations > Shopify and click Fetch orders.",
        "Pick a start date if asked (leave blank for the last 30 days).",
        "Wait for the summary. Read any warnings (missing SKU, missing phone, COD not detected).",
        "Open Orders to see the imported orders. Fetching again is safe; existing orders are updated, not duplicated.",
      ],
    },
    {
      title: "Check each order before shipping",
      steps: [
        "Open the order and check the address, phone number and payment type (COD or Prepaid).",
        "If an item shows 'mapping needed' or has no SKU, fix the SKU in Shopify or map it to your product.",
      ],
    },
    {
      title: "Ship with Shiprocket",
      steps: ["Create the shipment in Shiprocket for this order.", "Note the courier name and the AWB (tracking) number."],
    },
    {
      title: "Send tracking to Shopify",
      steps: [
        "Open the order and click the button to confirm the shipment on Shopify.",
        "Wait for 'Shopify fulfillment ... created'.",
        "In Shopify admin the order now shows Fulfilled and your customer gets the tracking email.",
      ],
    },
  ],

  troubleshooting: [
    {
      problem: "401 / 'Shopify rejected the Admin API access token'",
      cause: "The token is wrong, was revoked, belongs to a different store, or you pasted the API key or secret instead.",
      fix: "In Shopify, make sure the app is installed. If you no longer have the token, uninstall and reinstall the app, Reveal token once, copy the shpat_ token and save it again.",
    },
    {
      problem: "403 Forbidden / 'access denied' / 'requires merchant approval for read_orders scope'",
      cause: "The app is missing a permission, for example read_orders or the fulfillment order permissions, or has not been re-installed after you added scopes.",
      fix: "Settings > Apps and sales channels > Develop apps > your app > Configuration > Admin API integration: tick read_orders and the merchant_managed_fulfillment_orders read and write scopes, Save, then Install (or Update) the app again and use the new token.",
    },
    {
      problem: "404 Not found when testing the connection",
      cause: "The shop domain is wrong (you used your own website name, or a typo), or the API version is invalid.",
      fix: "Use the exact my-store.myshopify.com address from the Shopify admin address bar and clear the API version field.",
    },
    {
      problem: "429 Too Many Requests / slow fetch",
      cause: "Shopify limits apps (about 2 requests per second on standard plans, 4 on Advanced, 20 on Plus).",
      fix: "Wait a minute and fetch again; the app retries automatically. Fetch a smaller date range and avoid clicking repeatedly.",
    },
    {
      problem: "Older orders are missing",
      cause: "Shopify only gives apps the last 60 days of orders unless the app has read_all_orders.",
      fix: "Add read_all_orders to the app's scopes (Shopify may require approval), reinstall the app, then fetch again. Otherwise import older orders another way.",
    },
    {
      problem: "Orders show no address, name or phone",
      cause: "Shopify hides customer data from apps that are not approved for protected customer data.",
      fix: "In the app's settings in Shopify, request access to protected customer data (name, address, phone), then reinstall and fetch again. Check the 'Unverified' note below.",
    },
    {
      problem: "Warning: line item has no SKU / items need mapping",
      cause: "The product variant has no SKU in Shopify, or the SKU is different from your catalogue SKU.",
      fix: "In Shopify, Products > product > variant > SKU: set the same SKU as in this app, or map the item manually in the order.",
    },
    {
      problem: "COD order marked Prepaid",
      cause: "Shopify has no real COD flag. We guess from the gateway name, tags and note attributes containing 'cash on delivery' or 'cod'.",
      fix: "Check the order's payment type before shipping. Name your COD gateway 'Cash on Delivery (COD)' in Shopify > Settings > Payments, or add a 'COD' tag.",
    },
    {
      problem: "'Shopify reports no open fulfillment orders for this order; it may already be fulfilled'",
      cause: "The order was already marked fulfilled in Shopify, was cancelled, or is held or handled by another fulfilment service.",
      fix: "Open the order in Shopify admin and check its status. If it is already fulfilled, no action is needed. If another service manages it, ask that service to add tracking.",
    },
    {
      problem: "Tracking sent but customer sees no tracking link",
      cause: "The courier name does not exactly match a carrier Shopify knows.",
      fix: "In Shopify admin open the fulfillment and edit tracking, choosing the right carrier, or use a courier name Shopify recognises.",
    },
    {
      problem: "API version warning or unexpected behaviour",
      cause: "Shopify retires each API version after about 12 months; an old version is answered using the oldest supported one.",
      fix: "Set API version to a recent one such as the latest stable version listed on shopify.dev, or ask support to update the default.",
    },
    {
      problem: "Cannot find Develop apps or cannot create a custom app",
      cause: "Since 1 January 2026 Shopify no longer allows creating new admin-created custom apps. New apps are created in Shopify's Dev Dashboard, which gives short-lived tokens that this connection cannot use.",
      fix: "If your store already has an older custom app, use its token. Otherwise contact support; connecting a new store may need a different Shopify setup.",
    },
    {
      problem: "Test connection works but fetching returns 0 orders",
      cause: "No orders were updated in the selected date range, or the date is too old (60-day limit).",
      fix: "Pick an earlier start date within the last 60 days and fetch again.",
    },
  ],

  glossary: [
    { term: "Shop domain", meaning: "Your store's permanent address ending in .myshopify.com." },
    { term: "Custom app", meaning: "A private app you create inside your own Shopify store to let one tool access your data." },
    { term: "Admin API", meaning: "Shopify's interface that lets tools read and change your store data." },
    { term: "Access token", meaning: "A secret code (shpat_...) that proves the request is allowed. Treat it like a password." },
    { term: "Scope", meaning: "A single permission, such as read_orders, that you give the app." },
    { term: "API version", meaning: "A dated release of Shopify's API, like 2025-10. Shopify releases four a year." },
    { term: "Fulfillment", meaning: "Shopify's record that items in an order have been shipped, including courier and tracking number." },
    { term: "Fulfillment order", meaning: "The part of an order Shopify tracks for shipping from one location. A fulfillment is created against it." },
    { term: "AWB", meaning: "Air Waybill, the tracking number given by the courier." },
    { term: "SKU", meaning: "Your own product code, set per variant in Shopify, used to match items to your catalogue." },
    { term: "COD", meaning: "Cash on Delivery; customer pays the courier when the parcel arrives." },
    { term: "Rate limit", meaning: "Shopify's cap on how many calls an app can make per second." },
  ],

  links: [
    { label: "Shopify Help: Custom apps", url: "https://help.shopify.com/en/manual/apps/app-types/custom-apps" },
    { label: "Shopify Dev: Admin-created custom apps (legacy) and access tokens", url: "https://shopify.dev/docs/apps/build/authentication-authorization/legacy/admin-custom-apps" },
    { label: "Shopify Dev: Create an app in the Dev Dashboard", url: "https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard" },
    { label: "Shopify Dev: Client credentials grant", url: "https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant" },
    { label: "Shopify Dev: API versioning", url: "https://shopify.dev/docs/api/usage/versioning" },
    { label: "Shopify Dev: REST Admin API rate limits", url: "https://shopify.dev/docs/api/admin-rest/usage/rate-limits" },
    { label: "Shopify Dev: Order resource (REST)", url: "https://shopify.dev/docs/api/admin-rest/latest/resources/order" },
    { label: "Shopify Dev: Fulfillment resource (REST)", url: "https://shopify.dev/docs/api/admin-rest/latest/resources/fulfillment" },
    { label: "Shopify Dev: FulfillmentOrder resource (REST)", url: "https://shopify.dev/docs/api/admin-rest/latest/resources/fulfillmentorder" },
  ],

  lastVerified: "2026-10-04",

  unverified: [
    "Exact current Shopify admin button labels for the legacy flow (Settings > Apps and sales channels > Develop apps > Create an app > Configuration > Admin API integration > Configure > Install app > Reveal token once) come from Shopify docs/community text; Shopify's own page confirms only 'Apps > Develop apps > [your app] > API credentials' and 'Reveal token once'. Menu wording may differ in your admin.",
    "Whether a store without an existing legacy custom app can obtain a permanent shpat_ token today. Shopify says new admin-created custom apps cannot be created; the Dev Dashboard route documents only 24-hour client-credentials tokens, which this connection does not support.",
    "The exact scope names needed for fulfillment (read/write_merchant_managed_fulfillment_orders, and third_party/assigned variants) are inferred from the FulfillmentOrder docs and the endpoints the code calls; the REST fulfillment page did not list scopes in the text we could read.",
    "Whether protected customer data approval is required for a single-store custom app to see names/addresses/phones: Shopify's order docs mention protected customer data, but the exact steps in the Dev Dashboard were not confirmed.",
    "Which API version is the best default today; the code default is 2024-10, which is past Shopify's 12-month support window.",
    "Exact button labels in OUR UI (Fetch orders, Confirm shipment / Send tracking, Test connection) are assumed and should be matched to the real UI.",
  ],
};
