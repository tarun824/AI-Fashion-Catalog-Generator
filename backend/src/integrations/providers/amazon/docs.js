/**
 * In-app user guide for the Amazon India provider.
 * Plain data only. Rendered by the Integrations UI.
 * Research sources: developer-docs.amazon/sp-api (self-authorization, registering a private
 * application, marketplace IDs, PII/RDT guides). Anything not confirmed is listed in `unverified`.
 */
export default {
  providerId: "amazon",
  title: "Amazon India (Amazon.in)",
  tagline: "Bring Amazon orders into your catalog, publish products, sync stock and send tracking.",
  overview:
    "This connects your own Amazon.in seller account to this app using Amazon's Selling Partner API. " +
    "You can pull your Amazon orders into Orders, push products and stock/price changes to Amazon, and send the courier tracking number back after you ship. " +
    "You create a private app inside your own Amazon account, so no third party is involved and no Amazon approval is needed to use your own data (the buyer address needs one extra role).",

  howItWorks: [
    { title: "Customer buys on Amazon", body: "The customer orders your product on Amazon.in. Amazon holds the payment." },
    { title: "You click Fetch orders", body: "In this app, open Integrations > Amazon and click Fetch orders. Nothing runs by itself. We only talk to Amazon when you press a button." },
    { title: "Order appears in Orders", body: "New orders show up in the Orders page with items, price and buyer address (if your Amazon app has the address role). Items we cannot match to your products are flagged 'Needs mapping'." },
    { title: "Ship with Shiprocket (manual)", body: "Create the shipment and AWB in Shiprocket as you normally do. This step is manual and separate from Amazon." },
    { title: "Send tracking back", body: "Open the order and click Send tracking to Amazon. We send the courier name and AWB so Amazon marks the order as shipped." },
    { title: "Amazon pays you", body: "After delivery, Amazon settles the payment into your bank account on its normal payout cycle. This app does not handle money." },
  ],

  capabilities: [
    { label: "Fetch orders", button: "Fetch orders", description: "Reads your recent self-shipped Amazon.in orders (last 7 days on first run, then only changes since the last fetch) and saves them in Orders." },
    { label: "Publish products", button: "Publish to Amazon (with Check first)", description: "Sends a product from your catalog to Amazon as a listing. 'Check first' does a dry run and shows what Amazon would complain about, without changing anything." },
    { label: "Update stock", button: "Update stock", description: "Sets the available quantity of an already-listed SKU on Amazon." },
    { label: "Update price", button: "Update price", description: "Changes the selling price and/or MRP of an already-listed SKU on Amazon." },
    { label: "Send tracking", button: "Send tracking to Amazon", description: "Confirms shipment for an Amazon order using your courier name and AWB (tracking number)." },
  ],

  limitations: [
    "Everything is button-driven. There is no automatic sync in the background.",
    "Only orders you ship yourself (Amazon calls this MFN / Easy Ship-style self ship) are fetched. FBA orders (shipped by Amazon) are not imported and cannot be shipped by you.",
    "Buyer name/address needs Amazon's address (PII) role approval. Without it, orders import with 'Address hidden' and you cannot ship them from here.",
    "Addresses are fetched one order at a time and Amazon allows about 1 per second, so fetching many orders is slow (about 1 second per order).",
    "Amazon limits how often we can call it. If you click too fast you may see 'rate limited'. Wait a minute and retry.",
    "One SKU per product. The SKU on Amazon must match the SKU in this app (or be mapped).",
    "Publishing can be blocked by Amazon rules: Brand Registry for branded products, GTIN/barcode (or a GTIN exemption), category approvals.",
    "After publishing, the status is 'submitted', not 'live'. Amazon may take minutes to hours to process it and can still reject it. Check Seller Central > Manage All Inventory.",
    "Partially shipped orders are not handled. Tracking is sent for all remaining quantity.",
    "Only the Amazon.in marketplace is supported. The default product type is SAREE unless you change it.",
  ],

  prerequisites: [
    { text: "An active Amazon.in Professional seller account (individual/free accounts cannot create a private app).", link: "https://sellercentral.amazon.in" },
    { text: "You must be the primary user of that Seller Central account (the person who owns the login)." },
    { text: "Your products already listed (or ready to publish) on Amazon with the same SKU you use here." },
    { text: "A Shiprocket account connected in this app, to create AWBs for shipping." },
    { text: "About 30-60 minutes. Amazon may take a few days to approve your developer profile and the address role." },
  ],

  setup: [
    {
      title: "1. Check your seller account",
      steps: [
        "Sign in to Seller Central India with the primary (owner) login.",
        "Make sure your plan is Professional and the account is active (not suspended).",
        "Note your Seller ID: go to Settings > Account Info > Business Information and look for 'Merchant Token'.",
      ],
      link: "https://sellercentral.amazon.in",
      note: "The exact menu wording can differ slightly by account. See 'unverified'.",
    },
    {
      title: "2. Register as a developer",
      steps: [
        "In Seller Central, open Apps and Services > Develop Apps.",
        "If you see 'Proceed to Developer Registration', click it. If you land on Developer Central already, skip this step.",
        "Fill in the developer profile: your business details and contact. Choose that you are building a private app for your own business.",
        "Answer the data security questions honestly. Keep the description short, in your own words.",
        "Accept the Amazon policies (Acceptable Use, Data Protection) and submit.",
        "Wait for the approval email. This can take from a few hours to a few days.",
      ],
      link: "https://developer-docs.amazon/sp-api/docs/registering-as-a-developer",
      note: "Only the primary user can register.",
    },
    {
      title: "3. Create your private app",
      steps: [
        "Go to Seller Central > Apps and Services > Develop Apps (Developer Central).",
        "Click 'Add new app client'.",
        "App name: anything you like, for example 'My Catalog App'.",
        "API type: choose SP API.",
        "Leave the IAM ARN empty if it is optional. This app does not use AWS signing.",
        "Under roles, tick: Product Listing, Inventory and Order Tracking (or the closest 'Orders / Inventory / Listings' roles), and Direct-to-Consumer Shipping (Restricted) for buyer addresses.",
        "Save and register the app.",
      ],
      link: "https://developer-docs.amazon/sp-api/docs/registering-your-application",
      note: "Role names on Amazon's form change from time to time. Pick the ones that cover Orders, Listings, Inventory and the shipping address.",
    },
    {
      title: "4. Ask for the buyer address (PII) role",
      steps: [
        "In Developer Central, edit your app and open the roles section.",
        "Select 'Direct-to-Consumer Shipping (Restricted)'. It gives access to the buyer's shipping address.",
        "Amazon will ask why you need it. Write something like: 'We ship orders to our own customers and need the delivery address to create the courier label.'",
        "Submit and wait for approval. Until then, address calls fail and orders show 'Address hidden'.",
      ],
      link: "https://developer-docs.amazon.com/sp-api/docs/get-authorization-to-access-pii-for-bulk-orders",
      note: "Orders still import without this role. You just cannot ship them from here.",
    },
    {
      title: "5. Copy the LWA Client ID and Client Secret",
      steps: [
        "In Developer Central > your app, find the 'LWA credentials' section.",
        "Click 'View' next to 'LWA credentials'.",
        "Copy the Client identifier (starts with amzn1.application-oa2-client.) and the Client secret.",
        "Keep these private. Anyone with them can act on your account.",
      ],
    },
    {
      title: "6. Self-authorize and generate the Refresh Token",
      steps: [
        "In Developer Central, find your app. Click the arrow next to 'Edit App', then 'Authorize'.",
        "On the 'Authorize application' page, click 'Authorize app' for your seller account.",
        "A Refresh Token (starts with Atzr|) appears. Copy it right away.",
        "You can authorize while the app is still in Draft. You do not need to publish a private app.",
      ],
      link: "https://developer-docs.amazon/sp-api/docs/self-authorization",
      note: "Each click of 'Authorize app' makes a new token. Earlier tokens are not cancelled by this.",
    },
    {
      title: "7. Paste the values here and test",
      steps: [
        "In this app go to Integrations > Amazon India > Connect.",
        "Paste Seller ID, LWA Client ID, LWA Client Secret and Refresh Token. Leave the optional fields empty unless you know you need them.",
        "Click Save, then Test connection.",
        "You should see 'Connected to Amazon (Amazon.in)'. If not, see Troubleshooting below.",
      ],
    },
    {
      title: "8. First fetch",
      steps: [
        "Open the Amazon card and click Fetch orders.",
        "Go to Orders and filter by source Amazon.",
        "If you see 'Address hidden', your address role is not approved yet. If you see 'Needs mapping', follow the mapping steps in Using it day to day.",
      ],
    },
  ],

  fields: {
    sellerId: {
      label: "Seller ID (Merchant Token)",
      summary: "Your unique seller identifier on Amazon.",
      whereToFind: [
        "Sign in to Seller Central India.",
        "Go to Settings > Account Info.",
        "Open Business Information.",
        "Copy the value called 'Merchant Token' (also called Seller ID).",
      ],
      example: "A1B2C3D4E5F6G7",
      format: "About 13-14 capital letters and digits, usually starting with A.",
      link: "https://sellercentral.amazon.in",
      tips: ["It is not a secret, but do not post it publicly.", "Do not confuse it with your Amazon login email or a Marketplace ID."],
      required: true,
    },
    lwaClientId: {
      label: "LWA Client ID",
      summary: "Public ID of your private app.",
      whereToFind: [
        "Seller Central > Apps and Services > Develop Apps.",
        "Find your app and open its 'LWA credentials' (click View).",
        "Copy 'Client identifier'.",
      ],
      example: "amzn1.application-oa2-client.0123456789abcdef0123456789abcdef",
      format: "Starts with amzn1.application-oa2-client. followed by letters and digits.",
      link: "https://developer-docs.amazon/sp-api/docs/registering-your-application",
      tips: ["Make sure there is no space at the start or end when you paste."],
      required: true,
    },
    lwaClientSecret: {
      label: "LWA Client Secret",
      summary: "Secret password of your private app.",
      whereToFind: [
        "Same 'LWA credentials' section as the Client ID.",
        "Copy the 'Client secret'.",
        "If you lost it, rotate the secret in Developer Central and use the new one.",
      ],
      example: "amzn1.oa2-cs.v1.xxxx-sample-not-a-real-secret-xxxx",
      format: "Long text, usually starting with amzn1.oa2-cs.v1.",
      tips: ["Treat it like a bank password. Never share it on WhatsApp or email."],
      warning: "If this leaks, rotate it in Developer Central immediately.",
      required: true,
    },
    refreshToken: {
      label: "Refresh Token",
      summary: "Permission slip that lets this app act on your seller account.",
      whereToFind: [
        "Seller Central > Apps and Services > Develop Apps.",
        "Click the arrow next to 'Edit App' for your app, then 'Authorize'.",
        "Click 'Authorize app' for your seller account.",
        "Copy the Refresh Token shown on screen.",
      ],
      example: "Atzr|EXAMPLE-not-a-real-token-0000000000",
      format: "Starts with Atzr| and is several hundred characters long.",
      link: "https://developer-docs.amazon/sp-api/docs/self-authorization",
      tips: ["Copy it immediately and paste into this app.", "If Test says 'invalid_grant', generate a new one the same way."],
      warning: "Anyone with this token and your Client ID/Secret can read your orders.",
      required: true,
    },
    marketplaceId: {
      label: "Marketplace ID",
      summary: "Which Amazon website you sell on. Leave empty for Amazon.in.",
      whereToFind: [
        "Leave this empty. We use Amazon.in automatically.",
        "Only change it if Amazon support told you to.",
      ],
      example: "A21TJRUUN4KGV",
      format: "13-14 capital letters and digits. India is A21TJRUUN4KGV.",
      link: "https://developer-docs.amazon/sp-api/docs/marketplace-ids",
      tips: ["A wrong value makes Test say your account does not participate in that marketplace."],
      required: false,
    },
    endpoint: {
      label: "SP-API endpoint",
      summary: "Amazon server address for the Europe/India region. Leave empty.",
      whereToFind: ["Leave empty. Default is the Europe region server which includes India."],
      example: "https://sellingpartnerapi-eu.amazon.com",
      format: "A full https:// address with no trailing slash.",
      tips: ["Do not change this unless support asks."],
      required: false,
    },
    productType: {
      label: "Product type",
      summary: "Amazon category type used when publishing new products.",
      whereToFind: [
        "Decide the Amazon product type for your products, for example SAREE.",
        "If unsure, publish with 'Check first'. Amazon will tell you if the type is wrong.",
        "You can search types in Seller Central's Add a Product flow or in Amazon's Product Type Definitions API docs.",
      ],
      example: "SAREE",
      format: "Capital letters and underscores, as Amazon names the type.",
      tips: ["Default is SAREE. Change it if you sell something else, such as KURTA or SHIRT (check on Amazon)."],
      required: false,
    },
    brand: {
      label: "Brand name",
      summary: "Brand shown on new listings.",
      whereToFind: [
        "Type your brand exactly as registered on Amazon.",
        "If your brand is in Brand Registry, use the exact registered spelling.",
      ],
      example: "My Brand Sarees",
      format: "Plain text.",
      tips: ["A brand that does not match Brand Registry may be rejected by Amazon.", "Use 'Generic' only if Amazon allows it for your category."],
      required: false,
    },
    useSandbox: {
      label: "Use sandbox (true/false)",
      summary: "Testing mode with fake Amazon data.",
      whereToFind: ["Leave empty or set to false for real orders.", "Set true only if a developer asked you to test."],
      example: "false",
      format: "Exactly true or false.",
      tips: ["In sandbox you only get sample data, not your real orders."],
      warning: "If real orders do not show up, check this is not set to true.",
      required: false,
    },
  },

  security: [
    "Your Client Secret and Refresh Token are saved encrypted in our database (AES-256-GCM).",
    "Once saved they are never shown again. You will only see the last 4 characters.",
    "Keys are sent only to Amazon (api.amazon.com and the Selling Partner API servers). They are not sent to anyone else.",
    "To change a key here: open Integrations > Amazon India, click Edit or Reconnect, and paste the new value.",
    "To remove the connection here: use Disconnect. This deletes the saved keys from our database.",
    "To cut access on Amazon's side: in Seller Central > Apps and Services > Develop Apps, rotate the Client Secret and/or remove the app's authorization. Then update the new values here.",
    "Never share keys on chat or email. If you think they leaked, rotate on Amazon first, then update here.",
  ],

  usage: [
    {
      title: "Fetch orders",
      steps: [
        "Go to Integrations > Amazon India.",
        "Click Fetch orders.",
        "Wait. Each order's address takes about 1 second, so 50 orders can take a minute.",
        "Open Orders to see them. If a message mentions a rate limit, wait a minute and click again.",
      ],
    },
    {
      title: "Handling 'Address hidden'",
      steps: [
        "This means Amazon did not give us the buyer's address. Your address (PII) role is probably not approved yet.",
        "Check Developer Central > your app > roles for Direct-to-Consumer Shipping status.",
        "Once approved, click Fetch orders again. The address will fill in.",
        "Until then, do not ship that order from here.",
      ],
    },
    {
      title: "Handling 'Needs mapping'",
      steps: [
        "Amazon sends the SKU you used on Amazon. If we cannot find a product with that SKU, the item is flagged 'Needs mapping'.",
        "Open the product in Products and set its Amazon SKU to the exact SKU used on Amazon (check Manage All Inventory in Seller Central).",
        "Fetch orders again or re-open the order so the item links to your product.",
        "Tip: use the same SKU on Amazon and here from the start.",
      ],
    },
    {
      title: "Publish a product (with Check first)",
      steps: [
        "Open the product and choose Publish to Amazon.",
        "Click Check first. Read the issues list, for example 'Missing required attribute'.",
        "Fix those fields on the product or in the form shown, then run Check first again until it is clean.",
        "Click Publish. Status will be 'submitted'. Look in Seller Central > Manage All Inventory later to see if it went live.",
      ],
    },
    {
      title: "Update stock and price",
      steps: [
        "Open the product's Amazon listing in this app.",
        "Click Update stock and enter the quantity, or Update price and enter selling price and/or MRP.",
        "Amazon replies with Accepted or a reason for rejection.",
      ],
    },
    {
      title: "Send tracking after Shiprocket AWB",
      steps: [
        "Create the shipment in Shiprocket and get the AWB.",
        "Open the Amazon order in Orders.",
        "Click Send tracking to Amazon.",
        "You should see 'Tracking sent to Amazon'. Do this the same day you ship, to avoid late-dispatch penalties.",
      ],
    },
  ],

  troubleshooting: [
    {
      problem: "Test says 'refresh token is invalid, expired or revoked' (invalid_grant)",
      cause: "The refresh token was copied wrongly, belongs to a different app, or the authorization was removed.",
      fix: "In Developer Central click Authorize > Authorize app again, copy the new token, paste it here, and Test again.",
    },
    {
      problem: "Amazon rejected the LWA client id/secret",
      cause: "Client ID or Secret is wrong, has a space, or the secret was rotated.",
      fix: "Open LWA credentials in Developer Central, copy both again, and re-paste with no spaces.",
    },
    {
      problem: "403 Unauthorized or 'Amazon denied access'",
      cause: "Your app is missing a role such as Orders, Listings or Inventory.",
      fix: "Edit the app in Developer Central, add the missing role, save, then click Authorize app again to get a fresh token and update it here.",
    },
    {
      problem: "429 QuotaExceeded or 'rate limited'",
      cause: "You clicked Fetch too often. Amazon allows only a few calls per second or minute.",
      fix: "Wait a minute and fetch again. Avoid pressing the button repeatedly.",
    },
    {
      problem: "Orders show 'Address hidden'",
      cause: "The Direct-to-Consumer Shipping (address) role is not approved or the app was not re-authorized after approval.",
      fix: "Get the role approved, re-authorize the app to get a new refresh token if needed, update it here, then Fetch again.",
    },
    {
      problem: "Test says the account does not participate in marketplace",
      cause: "Marketplace ID is wrong or you are not selling on Amazon.in.",
      fix: "Clear the Marketplace ID field (default A21TJRUUN4KGV is Amazon.in) and Test again.",
    },
    {
      problem: "Order item shows 'Needs mapping'",
      cause: "The SKU on Amazon does not match any SKU in this app.",
      fix: "Set the product's Amazon SKU to the exact Amazon SKU, then fetch again.",
    },
    {
      problem: "Publish check shows 'Missing required attribute' or Amazon rejected the listing",
      cause: "Amazon requires more details for that product type, or the brand/GTIN rules block it.",
      fix: "Fill the listed fields, confirm the Product type and Brand, and check for Brand Registry or a GTIN exemption in Seller Central.",
    },
    {
      problem: "Test works but no real orders appear",
      cause: "Sandbox is turned on, or no self-shipped orders changed in the last 7 days, or they are FBA orders.",
      fix: "Set Use sandbox to false or empty. Only self-shipped (MFN) orders are fetched. Check Seller Central > Manage Orders.",
    },
    {
      problem: "Send tracking failed",
      cause: "Amazon already has tracking, the order is cancelled, or the ship date/order state is not valid.",
      fix: "Check the order in Seller Central. If it already shows shipped, no action is needed. Otherwise read the error text and retry.",
    },
    {
      problem: "Published but product is not visible on Amazon",
      cause: "Status 'submitted' only means Amazon accepted the request for processing.",
      fix: "Wait a few hours and check Seller Central > Manage All Inventory for errors or suppressed listings.",
    },
  ],

  glossary: [
    { term: "SP-API", meaning: "Selling Partner API. Amazon's official way for software to talk to your seller account." },
    { term: "LWA", meaning: "Login with Amazon. The sign-in system that issues your Client ID, Secret and Refresh Token." },
    { term: "Refresh Token", meaning: "A long-lived key that lets the app get short-lived access (about 1 hour) to your account." },
    { term: "Merchant Token / Seller ID", meaning: "Your unique seller number on Amazon." },
    { term: "Marketplace ID", meaning: "Code for an Amazon website. Amazon.in is A21TJRUUN4KGV." },
    { term: "MFN", meaning: "Merchant Fulfilled Network. You ship the order yourself." },
    { term: "FBA", meaning: "Fulfilled by Amazon. Amazon stores and ships the product." },
    { term: "PII", meaning: "Personal information such as the buyer's name and address. Amazon protects it with a special role." },
    { term: "RDT", meaning: "Restricted Data Token. A one-time pass we request so Amazon will give the buyer address." },
    { term: "SKU", meaning: "Your own code for a product. It must match on Amazon and here." },
    { term: "ASIN", meaning: "Amazon's own product code." },
    { term: "GTIN", meaning: "Barcode number (EAN/UPC). Amazon often needs it for new listings." },
    { term: "Brand Registry", meaning: "Amazon program that protects brands. Branded listings may need it." },
    { term: "AWB", meaning: "Air waybill, the courier tracking number from Shiprocket." },
  ],

  links: [
    { label: "SP-API documentation home", url: "https://developer-docs.amazon/sp-api" },
    { label: "Register as a developer", url: "https://developer-docs.amazon/sp-api/docs/registering-as-a-developer" },
    { label: "Register a private application", url: "https://developer-docs.amazon/sp-api/docs/registering-your-application" },
    { label: "Authorize private applications (self-authorization)", url: "https://developer-docs.amazon/sp-api/docs/self-authorization" },
    { label: "Marketplace IDs", url: "https://developer-docs.amazon/sp-api/docs/marketplace-ids" },
    { label: "Access PII (buyer address) with a Restricted Data Token", url: "https://developer-docs.amazon.com/sp-api/docs/get-authorization-to-access-pii-for-bulk-orders" },
    { label: "Seller Central India", url: "https://sellercentral.amazon.in" },
  ],

  lastVerified: "2026-10-04",

  unverified: [
    "Exact Seller Central India menu labels for 'Merchant Token' (Settings > Account Info > Business Information) and 'Develop Apps' could not be confirmed on an official page; Amazon docs only say 'Develop Apps'.",
    "Exact on-screen names and order of the role checkboxes, and the text of the address-role request form, were not confirmed.",
    "How long Amazon takes to approve developer registration and the address role was not found.",
    "Refresh token lifetime and revocation behavior is not stated in the docs; treat 'invalid_grant' as 'authorize again'.",
    "Exact location of the LWA 'View' link and the secret-rotation option inside Developer Central was not confirmed.",
    "Whether Direct-to-Consumer Shipping is granted instantly for a private self-seller app in India was not confirmed.",
    "Which product type names are valid for each Indian category (SAREE default is itself unconfirmed in our code).",
    "Button names shown here follow the plan; the final UI wording may differ slightly.",
  ],
};
