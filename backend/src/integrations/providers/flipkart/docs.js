/**
 * In-app user guide for the Flipkart integration.
 * Plain data only (no logic). Rendered by the UI / checked by the validator.
 * Facts about Flipkart screens come from official API docs + seller-tool help pages
 * (see `unverified` for anything we could not confirm on an official page).
 */
export default {
  providerId: "flipkart",
  title: "Flipkart",
  tagline: "Fetch Flipkart orders, link listings, update stock and price, and send tracking.",
  overview:
    "This connects your Flipkart seller account to your store using Flipkart's seller API. " +
    "You press buttons to bring Flipkart orders into Orders, to link products, and to tell Flipkart when you have shipped. " +
    "Nothing runs on its own. You ship the parcel with your own courier (we help you book it through Shiprocket) and Flipkart pays you as per your seller agreement.",

  howItWorks: [
    {
      title: "1. A customer buys on Flipkart",
      body: "The order is created in your Flipkart Seller Hub. Flipkart gives it an order id and a shipment id and sets a dispatch-by date.",
    },
    {
      title: "2. You press Fetch orders",
      body: "We ask Flipkart for your shipments that are not yet dispatched (approved, packing, packed, ready to dispatch) and for cancelled ones. Orders are not pushed to us automatically, so you press the button whenever you want new orders.",
    },
    {
      title: "3. The order appears in Orders",
      body: "Each Flipkart order shows with its customer, address, items and dispatch-by date. Items are matched to your products by SKU. If a SKU does not match, the order shows Needs mapping.",
    },
    {
      title: "4. You pack and ship with Shiprocket",
      body: "Open the order and use the Shiprocket button to book a courier and get an AWB (tracking number). This step is manual.",
    },
    {
      title: "5. You press Send tracking",
      body: "We tell Flipkart the shipment is dispatched (self-ship), with the courier name, AWB, invoice number and date. Flipkart then shows it as shipped.",
    },
    {
      title: "6. Flipkart pays you",
      body: "Delivery, returns and payouts are handled by Flipkart under your seller agreement. Check settlements in Seller Hub. We do not move money.",
    },
  ],

  capabilities: [
    {
      label: "Fetch orders",
      button: "Fetch orders",
      description:
        "Brings in Flipkart shipments that still need action, plus cancelled ones. Looks back 30 days if you do not pick a start date. Safe to press many times.",
    },
    {
      label: "Publish / link product",
      button: "Publish (needs the Flipkart product id)",
      description:
        "Links one of your products to an EXISTING Flipkart catalogue product. You must paste its Flipkart product id (FSN). We then send price, stock, tax code, HSN and dispatch days for your SKU.",
    },
    {
      label: "Update stock and price",
      button: "Update stock / Update price",
      description:
        "Sends the current stock (for your Location ID) or selling price and MRP for a SKU that is already linked.",
    },
    {
      label: "Send tracking",
      button: "Send tracking (on the order)",
      description:
        "Reports a self-ship dispatch to Flipkart with courier, AWB, invoice number and tax %. Use it after Shiprocket gives you the AWB.",
    },
  ],

  limitations: [
    "The listing API can only add your offer (price, stock) to a product that ALREADY exists in Flipkart's catalogue. It cannot create a brand-new style. Create the style in Seller Hub first, then paste its Flipkart product id here.",
    "Self-ship (you ship with your own courier) must be allowed for your account and the product. Flipkart decides this. If it is not allowed, Send tracking will fail.",
    "Orders shipped by Flipkart (FBF / Flipkart-fulfilled) cannot be shipped by you. We block Send tracking on them.",
    "Flipkart does not always tell us if an order is COD or prepaid. When it is unclear we show Prepaid and add a warning. Check COD orders yourself before booking the courier.",
    "If one Flipkart order is split into several shipments, we show them as one order but Send tracking only reports the FIRST shipment.",
    "Flipkart push notifications (webhooks) need a security certificate (VAPT) that we do not have, so there is no live feed. Use the Fetch orders button.",
    "Some request formats (listing, stock, price, dispatch) were built from the public docs and not yet confirmed on every account. If Flipkart rejects one, tell us the exact message so we can adjust.",
  ],

  prerequisites: [
    { text: "An active Flipkart seller account that can log in to Seller Hub.", link: "https://seller.flipkart.com/" },
    { text: "Your GSTIN, and a pickup (dispatch) location already added in Seller Hub." },
    { text: "Your products already live in Flipkart's catalogue (needed to link listings)." },
    { text: "A Shiprocket account connected in this app (to book the courier and get an AWB)." },
    { text: "Self-ship allowed on your account (you will ask Flipkart support to confirm, see setup step 5)." },
  ],

  setup: [
    {
      title: "1. Check your seller account",
      steps: [
        "Log in at seller.flipkart.com with the account owner login.",
        "Make sure your account is active and you can see the Orders page.",
      ],
      link: "https://seller.flipkart.com/",
    },
    {
      title: "2. Create a self-access application",
      steps: [
        "In Seller Dashboard open Manage Profile, then Developer Access.",
        "Click Create New Access.",
        "Type an Application Name (for example: My Store Sync) and a short Application Description.",
        "Submit. The new app appears in your list with an Application ID and an Application Secret.",
      ],
      link: "https://seller.flipkart.com/api-docs/FMSAPI.html",
      note: "Choose a self-access app. Do not use the third-party access option.",
    },
    {
      title: "3. Copy the App ID and App Secret",
      steps: [
        "Copy the Application ID and the Application Secret exactly. No spaces at the start or end.",
        "Keep the secret private. Anyone with it can read your orders.",
        "If you lose the secret, create a new self-access app or regenerate it as shown on that page.",
      ],
      note: "If the Developer Access page is missing or the secret is not shown, contact Flipkart seller support.",
    },
    {
      title: "4. Find your Location ID",
      steps: [
        "Every pickup location in Flipkart has a unique Location ID.",
        "Check Manage Profile in Seller Dashboard for your pickup / dispatch address list and look for the location id there.",
        "If you cannot see it, ask Flipkart seller support: 'Please share the location id for my pickup address for API use.'",
        "Some tool guides find it by opening Orders, pressing F12, choosing the Network tab and looking at the 'location' request. Use this only if you are comfortable, it is not an official Flipkart menu.",
      ],
      note: "Needed for stock updates, listings and dispatch. Not needed just to fetch orders.",
    },
    {
      title: "5. Ask Flipkart support to confirm self-ship",
      steps: [
        "Raise a ticket from Seller Hub help / support.",
        "Write: 'Please confirm that self-ship is enabled for my account and my listings, as I want to ship with my own courier and report dispatch by API.'",
        "Wait for their reply before using Send tracking.",
      ],
      note: "If self-ship is not allowed, we can still fetch orders, but you must ship through Flipkart's own process.",
    },
    {
      title: "6. Paste into the Connect form",
      steps: [
        "In this app go to Integrations, choose Flipkart, click Connect.",
        "Paste App ID and App Secret.",
        "Fill Location ID, Seller id, HSN, tax code, tax %, dispatch days, manufacturer, packer. See the field help below for what to enter.",
        "Save.",
      ],
    },
    {
      title: "7. Test and first Fetch",
      steps: [
        "Press Test connection. You should see 'Flipkart connection successful'.",
        "If it fails, read the Troubleshooting section.",
        "Open Orders and press Fetch orders. Any open Flipkart orders should appear.",
      ],
    },
  ],

  fields: {
    appId: {
      label: "App ID",
      summary: "The Application ID of your self-access app. Identifies you to Flipkart.",
      whereToFind: [
        "Seller Dashboard > Manage Profile > Developer Access.",
        "Open your self-access application.",
        "Copy the Application ID.",
      ],
      example: "a1b2c3d4e5f6a7b8c9d0 (fake)",
      format: "Text/numbers from Flipkart. Paste as is, no spaces.",
      link: "https://seller.flipkart.com/api-docs/FMSAPI.html",
      tips: ["Paste with Ctrl+V, do not retype.", "Check there is no space at the end."],
      required: true,
    },
    appSecret: {
      label: "App Secret",
      summary: "The password for your app. Together with App ID it lets us get an access token.",
      whereToFind: [
        "Seller Dashboard > Manage Profile > Developer Access.",
        "Open the same application as the App ID.",
        "Copy the Application Secret.",
      ],
      example: "XXXX-fake-secret-XXXX",
      format: "Text from Flipkart. Paste as is.",
      link: "https://seller.flipkart.com/api-docs/FMSAPI.html",
      tips: ["Never share it on WhatsApp or email.", "After you save, we never show it again (only the last 4 characters)."],
      warning: "Anyone with this secret can read your Flipkart orders. Keep it private.",
      required: true,
    },
    locationId: {
      label: "Seller location id",
      summary: "The id of your pickup / dispatch location in Flipkart. Stock and listings are tied to it.",
      whereToFind: [
        "Seller Dashboard > Manage Profile: look at your pickup / dispatch address list.",
        "If the id is not shown, ask Flipkart seller support for the location id of your pickup address.",
        "Advanced: some guides read it from the Orders page in the browser Network tab (not an official menu).",
      ],
      example: "LOC0000000000000000 (fake)",
      format: "Text id given by Flipkart. Often starts with LOC.",
      tips: [
        "If you have several pickup addresses, use the one your stock sits in.",
        "Required for Publish, Update stock and Send tracking. Leave blank only if you just fetch orders.",
      ],
      warning: "A wrong location id makes stock and listing calls fail. Double check it.",
      required: false,
    },
    sellerId: {
      label: "Seller id",
      summary: "Your Flipkart seller id. Optional. Used for reference only.",
      whereToFind: [
        "Seller Dashboard > Manage Profile (account details).",
        "If you cannot find it, leave it blank. Fetching orders does not need it.",
      ],
      example: "abc123xyz456 (fake)",
      format: "Text id from Flipkart.",
      tips: ["Safe to leave empty."],
      required: false,
    },
    defaultHsn: {
      label: "Default HSN code",
      summary: "The tax classification code used for a product that has no HSN of its own. Flipkart needs one to list.",
      whereToFind: [
        "Ask your CA, or check the HSN printed on your purchase invoice.",
        "Common sarees: 5007 (silk), 5208 or 5209 (cotton), 5407 (synthetic/polyester), 5513/5514 (blended).",
        "Ready-made apparel is in chapters 61 (knitted) and 62 (woven).",
      ],
      example: "5407",
      format: "4 to 8 digits, numbers only.",
      tips: [
        "Use the code of the main fabric. If you sell mixed fabrics, set HSN per product instead and use this as a fallback.",
        "Confirm with your CA. Wrong HSN can cause Flipkart or GST notices.",
      ],
      warning: "Without an HSN (here or on the product) Publish is blocked.",
      required: false,
    },
    defaultTaxCode: {
      label: "Default tax code",
      summary: "Flipkart's own tax category name for your product. Not the same as HSN.",
      whereToFind: [
        "Flipkart shows allowed tax codes when you list in Seller Hub (Listings). Pick the one for your category.",
        "If you do not know, leave blank. We then use GST_APPAREL.",
      ],
      example: "GST_APPAREL",
      format: "Capital letters and underscores, exactly as Flipkart names it.",
      tips: [
        "For sarees and apparel GST_APPAREL is the usual choice. Confirm in Seller Hub.",
        "If Flipkart says the tax code is invalid, copy the exact value Seller Hub shows for a similar product.",
      ],
      required: false,
    },
    defaultTaxPercent: {
      label: "Tax % for dispatch invoice",
      summary: "GST % we put on the invoice when we report a dispatch to Flipkart.",
      whereToFind: [
        "Your CA or your GST invoice for the product.",
        "Rule of thumb (as of late 2025): sarees 5% at any price. Other ready-made apparel 5% up to Rs 2,500 per piece and 18% above.",
      ],
      example: "5",
      format: "A number like 5 or 18. No % sign.",
      tips: [
        "If you leave it blank we use 5% up to Rs 2,500 per unit and 18% above. That rule is for ready-made apparel.",
        "Saree sellers: enter 5 so a saree above Rs 2,500 is not taxed at 18%.",
        "Confirm with your CA. GST slabs change.",
      ],
      warning: "A wrong tax % on the dispatch invoice is a compliance problem. Check with your CA.",
      required: false,
    },
    defaultDispatchSla: {
      label: "Dispatch SLA (days)",
      summary: "How many days you promise to take to hand over the parcel after an order.",
      whereToFind: ["It is your own decision. Pick what your team can really do."],
      example: "2",
      format: "Whole number of days. Blank means 2.",
      tips: [
        "Short SLA helps ranking but late dispatch costs penalties.",
        "Made-to-order or embroidered items need a longer SLA. Flipkart may limit the maximum allowed.",
      ],
      required: false,
    },
    manufacturerName: {
      label: "Manufacturer name",
      summary: "Printed on the legal label. Flipkart asks for it under legal metrology rules.",
      whereToFind: ["Your own business name, or the factory/brand that makes the product."],
      example: "Sample Textiles Pvt Ltd (fake)",
      format: "Plain text.",
      tips: ["If you resell, use the name on the supplier's label.", "Per-product values override this default."],
      required: false,
    },
    packerName: {
      label: "Packer name",
      summary: "Name of whoever packs the product. Also a label requirement.",
      whereToFind: ["Usually your own business name and city."],
      example: "Sample Textiles, Surat (fake)",
      format: "Plain text.",
      tips: ["Same as manufacturer if you pack your own goods."],
      required: false,
    },
    countryOfOrigin: {
      label: "Country of origin",
      summary: "Where the product is made.",
      whereToFind: ["Your own knowledge of the product."],
      example: "India",
      format: "Country name in English. Blank means India.",
      tips: ["Leave blank if your goods are made in India."],
      required: false,
    },
    selfShip: {
      label: "Self-ship (true/false)",
      summary: "true means you ship with your own courier (via Shiprocket). false means Flipkart's logistics.",
      whereToFind: [
        "Your choice, but Flipkart must allow it for your account.",
        "Ask Flipkart seller support to confirm self-ship is enabled (see setup step 5).",
      ],
      example: "true",
      format: "true or false. Blank means true.",
      tips: [
        "Keep true if you use Shiprocket.",
        "If set to false, Send tracking is switched off for Flipkart.",
      ],
      warning: "If Flipkart has not enabled self-ship for you, listings or dispatch can be rejected.",
      required: false,
    },
  },

  security: [
    "App ID and App Secret are stored ENCRYPTED in our database (AES-256-GCM).",
    "After you save, the secret is never shown again. Only the last 4 characters appear.",
    "They are sent only to Flipkart's servers, to get an access token and call the seller API.",
    "Flipkart's access token lasts about 60 days. We refresh it automatically, so you do nothing.",
    "To rotate: in Seller Dashboard > Manage Profile > Developer Access create a new self-access app (or regenerate), then edit the Flipkart connection here and paste the new values.",
    "To revoke: delete or disable the app in Developer Access on Flipkart. Then remove the Flipkart integration here.",
    "Use the account owner or a trusted login to create the app. Do not share these values over chat.",
  ],

  usage: [
    {
      title: "Fetch orders every day",
      steps: [
        "Go to Orders.",
        "Press Fetch orders for Flipkart.",
        "Read any yellow warnings (on hold, payment unclear, missing address).",
        "Sort by dispatch-by date and ship the earliest first.",
      ],
    },
    {
      title: "Fix 'Needs mapping' items",
      steps: [
        "Open the order. Items with Needs mapping have a Flipkart SKU that does not match any of your products.",
        "Choose the right product for that SKU, or change the SKU on the product to match Flipkart's.",
        "Save. The order is now ready to ship.",
      ],
    },
    {
      title: "Link a product to Flipkart",
      steps: [
        "In Seller Hub, create the style in the catalogue if it is not there yet. Wait until it is approved.",
        "Copy its Flipkart product id (FSN).",
        "Open the product in this app, go to its Flipkart listing, paste the id.",
        "Check MRP, selling price, stock, HSN. Selling price must not be more than MRP.",
        "Use Dry run / validate if shown, then Publish.",
      ],
    },
    {
      title: "Keep stock and price in sync",
      steps: [
        "After a change, open the linked product and press Update stock or Update price.",
        "It is a manual button. Flipkart does not change by itself when you edit here.",
      ],
    },
    {
      title: "Ship and send tracking",
      steps: [
        "On the order press the Shiprocket button, pick a courier and get the AWB.",
        "Pack and hand over the parcel before the dispatch-by date.",
        "Press Send tracking on the order.",
        "You should see 'Dispatch reported to Flipkart'. If the order had no invoice number, we create one like INV-<order number>.",
      ],
    },
  ],

  troubleshooting: [
    {
      problem: "Test connection says credentials invalid / 401 / 400",
      cause: "App ID or App Secret is wrong, has a space, or the app was deleted.",
      fix: "Copy both again from Manage Profile > Developer Access with no spaces. Make sure it is a self-access app. Save and Test again.",
    },
    {
      problem: "It worked before, now says unauthorized",
      cause: "The access token (about 60 days) expired or the app secret was changed.",
      fix: "We refresh tokens automatically. If it still fails, the secret was changed or the app was removed in Flipkart. Paste the new secret.",
    },
    {
      problem: "Fetch orders returns nothing",
      cause: "No open Flipkart orders, orders are older than 30 days, or already dispatched.",
      fix: "Check Orders in Seller Hub. We fetch only orders not yet dispatched, plus cancelled ones, from the last 30 days.",
    },
    {
      problem: "Orders are missing the customer address",
      cause: "Flipkart did not return the address for that shipment, or the details call failed.",
      fix: "Press Fetch orders again. If it persists, copy the address from Seller Hub before shipping.",
    },
    {
      problem: "'Location id is required' or stock update fails",
      cause: "Location ID is blank or wrong.",
      fix: "Get the right id from Manage Profile or Flipkart support and put it in the Connect form.",
    },
    {
      problem: "Publish says 'Create this style in Flipkart Seller Hub first'",
      cause: "No valid Flipkart product id on the listing. The API cannot create new catalogue styles.",
      fix: "Create the style in Seller Hub, then paste its Flipkart product id (13 to 16 characters).",
    },
    {
      problem: "Publish rejected: HSN or tax code error",
      cause: "No HSN set, or the tax code name is not one Flipkart accepts.",
      fix: "Set Default HSN (for example 5407 for synthetic sarees) and use the exact tax code name shown in Seller Hub. Ask your CA if unsure.",
    },
    {
      problem: "Selling price cannot exceed MRP",
      cause: "The listing price is higher than MRP.",
      fix: "Raise MRP or lower the selling price on the product.",
    },
    {
      problem: "Send tracking says shipment is not eligible for self-ship / Flipkart-fulfilled",
      cause: "The order is FBF, or self-ship is not enabled for your account.",
      fix: "FBF orders are shipped by Flipkart. For others ask Flipkart support to enable self-ship. Also check Self-ship is true here.",
    },
    {
      problem: "'This order has no Flipkart shipment id'",
      cause: "The order was not brought in by Fetch orders.",
      fix: "Press Fetch orders again so the shipment id is saved.",
    },
    {
      problem: "Order shows a hold warning and cannot be shipped",
      cause: "Flipkart put the order on hold (for example payment or verification).",
      fix: "Do not ship. Wait until Flipkart releases it in Seller Hub, then Fetch orders again.",
    },
    {
      problem: "Too many requests / rate limit / 429 or timeout",
      cause: "Flipkart limits how fast the API can be called.",
      fix: "Wait a minute and try once. Avoid pressing buttons repeatedly. We retry a few times by ourselves.",
    },
    {
      problem: "Order is COD but shows Prepaid",
      cause: "Flipkart did not tell us the payment type, so we default to Prepaid and warn.",
      fix: "Check the order in Seller Hub. Set COD yourself before booking the courier.",
    },
    {
      problem: "Dispatch rejected with a field or format error",
      cause: "Our dispatch format was built from public docs and may differ for your account.",
      fix: "Copy the exact error text and send it to support so we can adjust. Meanwhile mark dispatch in Seller Hub.",
    },
  ],

  glossary: [
    { term: "FSN", meaning: "Flipkart Serial Number. Flipkart's id for a catalogue product. Our listing field 'Flipkart product id' is this." },
    { term: "Listing id", meaning: "Flipkart's id for YOUR offer (your price and stock) on a catalogue product." },
    { term: "Shipment id", meaning: "Flipkart's id for one parcel of an order. One order can have more than one shipment." },
    { term: "Dispatch-by date", meaning: "The last date you must hand the parcel to the courier. Late dispatch can bring penalties." },
    { term: "FBF", meaning: "Fulfilled by Flipkart. Flipkart stores, packs and ships. You cannot dispatch these." },
    { term: "Self-ship", meaning: "You pack and ship with your own courier and tell Flipkart the tracking number." },
    { term: "SLA", meaning: "Service level agreement. Here: days you promise to take to dispatch." },
    { term: "HSN", meaning: "Harmonised System of Nomenclature. A number that classifies a product for GST." },
    { term: "GSTIN", meaning: "Your 15-character GST registration number." },
    { term: "Location id", meaning: "Flipkart's id for one of your pickup/dispatch locations. Stock is kept per location." },
    { term: "AWB", meaning: "Air Waybill. The courier's tracking number for the parcel." },
  ],

  links: [
    { label: "Flipkart Seller Hub", url: "https://seller.flipkart.com/" },
    { label: "Flipkart seller API docs", url: "https://seller.flipkart.com/api-docs/" },
    { label: "Flipkart Marketplace Seller APIs (self-access app, tokens)", url: "https://seller.flipkart.com/api-docs/FMSAPI.html" },
    { label: "Flipkart Order Management API overview", url: "https://seller.flipkart.com/api-docs/order-api-docs/OMAPIOverview.html" },
    { label: "Flipkart API release notes", url: "https://seller.flipkart.com/api-docs/changelog.html" },
  ],

  lastVerified: "2026-10-04",

  unverified: [
    "Exact way to find the Location ID: the official docs we could read do not show a menu. The browser Network tab method comes from third-party tool guides.",
    "Exact wording of the Seller Hub support/help path for raising a self-ship ticket.",
    "Self-ship eligibility rules (who qualifies, penalties). Taken from general seller guides, not an official page.",
    "Request formats for listing create, stock update, price update and self-ship dispatch (paths and field names are best guesses from docs).",
    "Value list for Flipkart tax codes (GST_APPAREL is our default; confirm in Seller Hub).",
    "GST slabs: sarees 5% at any price and apparel 5% up to Rs 2,500 / 18% above (after 22 Sep 2025) come from CA/tax blogs, not a government page. Confirm with your CA.",
    "Whether a secret can be regenerated on the Developer Access page, or only a new app created.",
  ],
};
