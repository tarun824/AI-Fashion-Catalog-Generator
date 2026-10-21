/**
 * In-app user guide for the Shiprocket integration.
 * Facts about OUR app come from the code (shiprocketService.js, shippingRoutes.js, routes.js).
 * Facts about Shiprocket come from support.shiprocket.in / apidocs.shiprocket.in (see links, unverified).
 */
export default {
  providerId: "shiprocket",
  title: "Shiprocket",
  tagline: "Ship any order with a courier, print the label, book pickup and track it.",
  overview:
    "Shiprocket is a shipping aggregator: one account gives you many couriers (Delhivery, Bluedart, etc.). " +
    "This app uses it to ship orders from every source - your website, Amazon, Flipkart and Shopify. " +
    "Everything is button-driven: you open an order, click Ship, pick a courier, print the label and book pickup. " +
    "Important: unlike Amazon and Flipkart, Shiprocket login details are NOT typed into the browser yet. " +
    "They are set once in the backend server's .env file by whoever manages your server.",

  howItWorks: [
    {
      title: "1. The order is in the app",
      body: "Website orders appear automatically. Amazon, Flipkart and Shopify orders appear after you import them from their own Integrations card. Shiprocket only sees an order once you start shipping it.",
    },
    {
      title: "2. Click Ship and create the Shiprocket order",
      body: "On Orders or Order Detail, open the Ship Order wizard (or use One-Click Ship). Step 1 'Create Order' registers the order with Shiprocket using your pickup location (default name: Primary), the buyer address, items, payment type (COD or Prepaid) and an estimated parcel size and weight.",
    },
    {
      title: "3. Choose a courier",
      body: "Step 2 'Select Courier' shows the couriers that can deliver to the buyer's pincode, with price and delivery estimate. You pick one and the app assigns it. This creates the AWB (tracking number) and charges the freight to your Shiprocket wallet.",
    },
    {
      title: "4. Print the label and book pickup",
      body: "Step 3 'Generate Label' gives a PDF to stick on the parcel. Step 4 'Schedule Pickup' books the courier to collect it (the app suggests the next day, skipping Sunday).",
    },
    {
      title: "5. Tracking updates arrive by webhook",
      body: "Shiprocket calls this app each time the parcel moves (picked up, in transit, out for delivery, delivered, RTO). The app updates the order status and tracking history on its own. This needs a webhook set up in Shiprocket and a public URL for your server.",
    },
    {
      title: "6. Send tracking back to the marketplace",
      body: "For Amazon, Flipkart or Shopify orders, open the order and click 'Send tracking to <channel>' so the marketplace marks it shipped and the buyer sees the tracking number. This is a manual click, it does not happen automatically.",
    },
  ],

  capabilities: [
    { label: "Create shipment", button: "Ship Order > Create Shiprocket Order", description: "Registers the order with Shiprocket. Safe to repeat: if it already exists the app skips ahead." },
    { label: "Get courier rates", button: "Select Courier", description: "Lists couriers serviceable for the buyer's pincode with rate and estimated delivery." },
    { label: "Assign courier", button: "Assign Courier", description: "Books the chosen courier and generates the AWB. Freight is deducted from your Shiprocket wallet." },
    { label: "Generate label", button: "Generate Label PDF", description: "Creates the shipping label PDF to print and stick on the parcel." },
    { label: "Schedule pickup", button: "Schedule Pickup", description: "Asks the courier to collect the parcel from your pickup location on a chosen date." },
    { label: "Track", button: "Track / tracking section on Order Detail", description: "Shows live status and scan history. Also updated automatically through the webhook." },
    { label: "Cancel", button: "Cancel shipment", description: "Cancels the Shiprocket shipment. Possible only before the courier has picked the parcel up." },
    { label: "One-click ship", button: "One-Click Ship", description: "Does create, cheapest-courier selection, label and pickup in one go for a single order." },
    { label: "Bulk ship", button: "Bulk ship (Orders page)", description: "Runs the same flow for many selected orders and prints their labels together." },
  ],

  limitations: [
    "Credentials are read from the server's .env file, not from the browser. Changing them needs a server restart.",
    "Your Shiprocket account must have KYC completed. Without it Shiprocket refuses to create or ship orders.",
    "Freight is charged from your Shiprocket wallet. If the balance is too low, assigning a courier fails until you recharge.",
    "COD money is paid out by Shiprocket to your bank some days after delivery (the exact cycle depends on your plan). The app marks a COD order 'paid' on delivery, but that is not the same as the money reaching your bank.",
    "Do NOT ship orders that the marketplace fulfils itself (Amazon FBA / Flipkart Fulfilment). The app shows 'The marketplace ships this order' for these and hides the Ship button. Shipping them yourself would create a duplicate parcel.",
    "Parcel weight and size are estimated by the app (about 0.5 kg per item, capped at 5 kg), not measured. Shiprocket may re-weigh and charge extra if the real parcel is heavier.",
    "Couriers only deliver to pincodes they serve. If none serves the buyer's pincode you cannot ship that order via Shiprocket.",
    "Tracking updates need Shiprocket to reach your server. A server on localhost or behind a firewall will not receive them; use the Track button instead.",
    "The pickup location used must exactly match a pickup address name in your Shiprocket account (default name expected: Primary).",
    "Tracking is not pushed to Amazon/Flipkart/Shopify automatically; use 'Send tracking to <channel>'.",
    "Shiprocket's own 'Channels' feature (below) is separate and is not used by this app.",
  ],

  prerequisites: [
    { text: "A Shiprocket seller account with KYC completed and a bank account added.", link: "https://support.shiprocket.in" },
    { text: "Money in your Shiprocket wallet (Shiprocket documents a minimum recharge of Rs 500 in one source; check the Shiprocket panel for the current amount)." },
    { text: "At least one pickup address saved in Shiprocket, with its name noted (e.g. Primary)." },
    { text: "A dedicated Shiprocket API user (created below). Do not use your main login." },
    { text: "Access to the backend server's .env file (ask your developer or hosting person) and ability to restart the backend." },
    { text: "For automatic tracking: your backend must be reachable from the internet over a public https URL." },
  ],

  setup: [
    {
      title: "Step 1. Create a dedicated API user in Shiprocket",
      steps: [
        "Log in to the Shiprocket panel with your normal account.",
        "In the left menu click Settings.",
        "Click API, then Configure.",
        "Click 'Create an API User'.",
        "Enter an email address that is DIFFERENT from the email you log in with. It must be a real, valid address you can access.",
        "Choose a strong password and save.",
        "Write down this API user email and password. Shiprocket allows up to 4 API users.",
      ],
      link: "https://support.shiprocket.in/support/solutions/articles/43000604103-how-to-create-an-api-user-can-i-have-more-than-one-api-users-",
      note: "This API user email and password are what the app uses. They are not your main Shiprocket login.",
    },
    {
      title: "Step 2. Add a pickup address in Shiprocket",
      steps: [
        "In Shiprocket go to Settings, then Pickup Addresses (menu name per our internal guide; Shiprocket may label it slightly differently).",
        "Add your warehouse/shop address with a valid phone number and pincode.",
        "Give it a short nickname (pickup location name), for example Primary. Make it your primary/default one.",
        "Complete any verification Shiprocket asks for on the address.",
      ],
      note: "The app sends the nickname as 'pickup_location' for every shipment. If the nickname does not match exactly, you get a pickup location error.",
    },
    {
      title: "Step 3. Put the credentials in the backend .env",
      steps: [
        "Open the .env file of the backend (the folder named backend) on your server.",
        "Add the two lines: SHIPROCKET_EMAIL=<API user email> and SHIPROCKET_PASSWORD=<API user password>.",
        "Leave SHIPROCKET_API_BASE out unless Shiprocket tells you otherwise.",
        "Save the file and restart the backend (for example restart the node/pm2 process).",
        "Open Integrations in the app. Shiprocket should now show as configured; use the connection test to confirm.",
      ],
      note: "Unlike Amazon and Flipkart there is no form in the browser for this yet.",
    },
    {
      title: "Step 4. Turn on tracking updates (webhook)",
      steps: [
        "Find your public backend URL. The app listens at: <your public backend URL>/api/ai-fashion-generator/webhooks/shiprocket (the /api/ai-fashion-generator part is the default API_PREFIX; use yours if you changed it).",
        "In Shiprocket go to Settings, then API, then Webhooks.",
        "Paste that URL, switch the toggle on and save.",
        "Shiprocket also offers an optional 'security token' field. Shiprocket sends it as an x-api-key header. This app does not check it yet, so it is optional.",
      ],
      link: "https://apidocs.shiprocket.in/view/metadata/SzYW1zB2",
      note: "Shiprocket's webhook rules say the URL should not contain words like shiprocket, kartrocket, sr or kr. Our default URL contains 'shiprocket', so if Shiprocket rejects it, ask your developer to expose an alternate path or proxy. Also the URL must answer HTTP 200 quickly.",
    },
    {
      title: "Step 5. Do a test shipment",
      steps: [
        "Create a small test order on the website with a pincode you know is served.",
        "Open the order and run Ship Order up to Select Courier.",
        "If couriers are listed, your credentials, KYC and pickup address are fine. Cancel the test shipment if you do not want to ship it.",
      ],
    },
  ],

  fields: {
    SHIPROCKET_EMAIL: {
      label: "Shiprocket API user email",
      summary: "Email of the dedicated Shiprocket API user. The app logs in with it to get a token.",
      whereToFind: [
        "Shiprocket panel > Settings > API > Configure.",
        "Use the email you entered when you clicked 'Create an API User'. It is NOT your normal login email.",
      ],
      example: "api-user@yourshop.example",
      format: "A valid email address, different from your main Shiprocket login.",
      link: "https://support.shiprocket.in/support/solutions/articles/43000604103-how-to-create-an-api-user-can-i-have-more-than-one-api-users-",
      tips: [
        "Set in the backend .env file, one line: SHIPROCKET_EMAIL=...",
        "Restart the backend after changing it.",
        "The Integrations page treats Shiprocket as 'enabled' once this is set.",
      ],
      warning: "Do not use your main Shiprocket login email here.",
      required: true,
    },
    SHIPROCKET_PASSWORD: {
      label: "Shiprocket API user password",
      summary: "Password of that API user. Used only to log in and obtain a token.",
      whereToFind: [
        "The password you chose when creating the API user in Settings > API > Configure.",
        "If you forgot it, create a new API user (up to 4 allowed) and use the new email and password.",
      ],
      example: "Use-a-long-random-password-1!",
      format: "Plain text, exactly as set in Shiprocket. If it has special characters like # or spaces, wrap it in quotes in .env.",
      tips: [
        "Set in the backend .env file: SHIPROCKET_PASSWORD=...",
        "Restart the backend after changing it.",
        "A long password without a # character avoids .env parsing problems.",
      ],
      warning: "Keep this secret. Never put it in the frontend, chat, screenshots or Git.",
      required: true,
    },
    SHIPROCKET_API_BASE: {
      label: "Shiprocket API address (optional)",
      summary: "Where the app sends Shiprocket requests. Almost nobody needs to set this.",
      whereToFind: ["Leave it unset to use the default."],
      example: "https://apiv2.shiprocket.in/v1/external",
      format: "A full https URL ending in /v1/external, no trailing slash.",
      tips: ["Only change if Shiprocket support tells you to, or for a test environment."],
      required: false,
    },
  },

  security: [
    "The email and password live only in the backend server's .env file (SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD). They are not typed in or shown in the browser.",
    "After login, Shiprocket returns a token. The app keeps it in server memory and also saves it in the database (Integration record named 'shiprocket') so it survives restarts. The app treats it as valid for 9 days; Shiprocket documents about 10 days.",
    "The database record stores the API email and the password as '***' (not the real password), plus the token and its expiry. Anyone with database access could use the token until it expires.",
    "Create a dedicated Shiprocket API user and use only that. Never put your main login here. If it leaks you can delete or replace that API user without touching your main account.",
    "Every Shiprocket call is recorded in the API Logs page. Check that page's masking of tokens/passwords with your developer before sharing screenshots.",
    "The webhook endpoint currently accepts any POST and does not verify Shiprocket's x-api-key security token, so keep the URL private and ask your developer to add the check.",
    "Never commit the .env file to Git or send it over chat.",
  ],

  usage: [
    {
      title: "Ship a website order",
      steps: [
        "Go to Orders and open the order (status Confirmed or Processing).",
        "Click Ship (or Ship Order) to open the wizard. Pick your pickup location if asked.",
        "Step 1: click 'Create Shiprocket Order'.",
        "Step 2: compare couriers on price and delivery days, pick one and confirm.",
        "Step 3: click 'Generate Label PDF', download and print it, stick it on the parcel.",
        "Step 4: click 'Schedule Pickup' and confirm the date.",
        "Pack the parcel and hand it to the courier on the pickup date.",
      ],
    },
    {
      title: "Ship a marketplace order (Amazon / Flipkart / Shopify) and send tracking",
      steps: [
        "First import the order from the channel's own card on Integrations.",
        "Open the order. If it says the marketplace ships it (FBA / Fulfilment), stop: do nothing.",
        "Otherwise run Ship Order exactly as for a website order.",
        "After a courier is assigned (AWB exists), click 'Send tracking to <channel>' in the marketplace panel on the order.",
        "Check the order on the marketplace's seller panel to confirm it shows Shipped. Delivery deadlines run from that confirmation, so do this promptly.",
      ],
    },
    {
      title: "Bulk ship",
      steps: [
        "On Orders, tick the orders to ship (only ones you fulfil yourself).",
        "Choose the bulk ship action.",
        "The app creates each shipment, assigns a courier automatically and generates labels together.",
        "Read the result message ('Shipped X of Y'). Orders that failed need to be fixed (address, pincode, KYC, wallet) and shipped again one by one.",
        "Schedule pickup for the batch from each order or in the Shiprocket panel.",
      ],
    },
    {
      title: "Cancel a shipment",
      steps: [
        "Open the order that has a Shiprocket shipment.",
        "Click the cancel shipment option.",
        "Cancel only before the courier picks up. After pickup, wait for return (RTO) instead.",
        "If it was a marketplace order, also update the marketplace yourself if needed.",
      ],
    },
    {
      title: "Read tracking",
      steps: [
        "Open the order and look at the shipping section: courier, AWB, status and scan history.",
        "Status changes (picked up, in transit, delivered, RTO) update automatically if the webhook is set up.",
        "If it looks stale, use the Track button to fetch the latest from Shiprocket.",
      ],
    },
  ],

  troubleshooting: [
    {
      problem: "Error mentioning KYC (for example 'KYC verification is mandated').",
      cause: "Your Shiprocket account KYC is not completed or not approved yet.",
      fix: "Complete KYC in the Shiprocket panel and wait for approval, then retry the shipment.",
    },
    {
      problem: "'Failed to authenticate with Shiprocket' or connection test fails.",
      cause: "Wrong SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD, not an API user, or the backend was not restarted after editing .env.",
      fix: "Recheck both values (no extra spaces, quote passwords with special characters), make sure they belong to the API user from Settings > API > Configure, then restart the backend.",
    },
    {
      problem: "No couriers listed in Select Courier.",
      cause: "No courier serves the buyer's pincode, the pickup pincode is wrong, or the parcel/weight data is unusual.",
      fix: "Verify the buyer pincode and the pickup address pincode in Shiprocket. Try the same pincode in the Shiprocket panel rate calculator. If still none, that area is not serviceable by your couriers.",
    },
    {
      problem: "Pickup location error.",
      cause: "The pickup nickname the app sends (default Primary) does not exist in Shiprocket or is not verified.",
      fix: "In Shiprocket Settings > Pickup Addresses create or rename an address to exactly the same name, complete verification, retry.",
    },
    {
      problem: "'Insufficient balance' when assigning a courier.",
      cause: "Shiprocket wallet has less money than the freight charge.",
      fix: "Recharge the wallet from the Shiprocket panel, then click Assign Courier again.",
    },
    {
      problem: "Label generation fails or the label link is empty.",
      cause: "The courier was not assigned yet (no AWB), or Shiprocket is still processing the shipment.",
      fix: "Make sure step 2 completed and an AWB shows on the order, wait a minute, then click Generate Label again.",
    },
    {
      problem: "Order status does not update after pickup or delivery.",
      cause: "Webhook not configured, toggle off, URL not public, wrong path, or Shiprocket rejected a URL containing 'shiprocket'.",
      fix: "Re-check Settings > API > Webhooks in Shiprocket, test your URL from outside your network, look at API Logs for inbound webhook entries, and use the Track button meanwhile.",
    },
    {
      problem: "'Order already created in Shiprocket' message.",
      cause: "The order was already registered earlier.",
      fix: "This is harmless: continue from Select Courier.",
    },
    {
      problem: "Pincode not serviceable / delivery not available.",
      cause: "The couriers on your plan do not deliver to that pincode (or not for COD).",
      fix: "Try switching the order to prepaid, ask the buyer for a nearby serviceable pincode, or ship that one outside Shiprocket.",
    },
    {
      problem: "Pickup was missed or schedule pickup fails.",
      cause: "Pickup date is a holiday/Sunday, a pickup is already booked, or the courier is not assigned.",
      fix: "Choose another date, check the Shiprocket panel for an existing pickup, and confirm an AWB is assigned.",
    },
    {
      problem: "Shiprocket token seems expired after a long time.",
      cause: "The cached token is valid only about 9-10 days.",
      fix: "Normally it renews itself on the next call. If not, verify credentials and restart the backend.",
    },
  ],

  glossary: [
    { term: "AWB", meaning: "Air Waybill: the courier tracking number printed on the label." },
    { term: "Label", meaning: "The PDF with the buyer address and barcode that you stick on the parcel." },
    { term: "Manifest", meaning: "A list of all parcels handed to a courier at pickup. Shiprocket generates it; the courier agent usually asks for it." },
    { term: "Pickup location", meaning: "The saved address (with a nickname) in Shiprocket from where the courier collects parcels." },
    { term: "Serviceability", meaning: "Whether a courier delivers to a given pincode (and whether it allows COD there)." },
    { term: "COD", meaning: "Cash on Delivery: the courier collects the money from the buyer and Shiprocket pays you later." },
    { term: "COD remittance", meaning: "The payout of collected COD money from Shiprocket to your bank account, some days after delivery." },
    { term: "NDR", meaning: "Non-Delivery Report: the courier could not deliver (buyer unavailable, wrong address). You must act, usually via the Shiprocket panel, or the parcel goes back." },
    { term: "RTO", meaning: "Return To Origin: the parcel is coming back to you after failed delivery or refusal. Return freight may be charged." },
    { term: "Wallet", meaning: "Prepaid balance in Shiprocket from which freight is deducted." },
    { term: "API user", meaning: "A separate Shiprocket login created only for software integrations." },
    { term: "Webhook", meaning: "A call Shiprocket makes to your server when a parcel's status changes." },
    { term: "FBA / Fulfilment", meaning: "The marketplace stores and ships the product itself. You must not ship those orders." },
  ],

  links: [
    { label: "Shiprocket: how to create an API user", url: "https://support.shiprocket.in/support/solutions/articles/43000604103-how-to-create-an-api-user-can-i-have-more-than-one-api-users-" },
    { label: "Shiprocket: API documentation help sheet", url: "https://support.shiprocket.in/support/solutions/articles/43000337456-shiprocket-api-document-helpsheet" },
    { label: "Shiprocket API reference (authentication, webhooks)", url: "https://apidocs.shiprocket.in/view/metadata/SzYW1zB2" },
    { label: "Shiprocket: integrate Amazon as a channel", url: "https://support.shiprocket.in/support/solutions/articles/43000659842-how-do-i-integrate-amazon-as-a-channel-" },
    { label: "Shiprocket: steps for hassle-free COD remittance", url: "https://support.shiprocket.in/support/solutions/articles/43000664186-what-are-the-necessary-steps-to-be-fulfilled-for-hassle-free-cod-remittance-" },
    { label: "Shiprocket: how to book and process shipments", url: "https://shiprocket.in/x/guides/how-to-book-and-process-shipments" },
  ],

  lastVerified: "2026-10-04",

  unverified: [
    "Exact current Shiprocket menu name for pickup addresses (our internal guide says Settings > Pickup Addresses; not re-checked on the live panel).",
    "Current minimum wallet recharge amount (one source says Rs 500, another mentions Rs 200); check the Shiprocket panel.",
    "Exact COD remittance days per plan (sources say roughly 2-4 days after delivery, thrice a week); confirm in your Shiprocket plan.",
    "Shiprocket Channels for Flipkart was not researched (only Amazon). Shiprocket Channels (Settings > Channels > Add New Channel) can import Amazon orders and sync status for self-ship orders on Shiprocket's side; this app does NOT use it and imports marketplace orders itself. Running both for the same orders may create duplicates, so use one approach per marketplace.",
    "Token validity: Shiprocket docs reported as ~10 days; app caches 9 days. Not re-confirmed on apidocs (site returned 502 during research).",
    "Webhook rule that URLs must not contain 'shiprocket/kartrocket/sr/kr' comes from a secondary summary of the API docs, not confirmed on the live page. Our default webhook path contains 'shiprocket'.",
    "Exact button labels for cancel, bulk ship and track in the current UI were not all verified; labels in capabilities for those are descriptive.",
    "The webhook x-api-key check is not implemented in our code (verified by search); Shiprocket's security token field is described as optional in secondary sources.",
  ],
};
