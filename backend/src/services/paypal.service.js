/**
 * PayPal service - create and capture orders
 */
const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID || "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";

  if (process.env.NODE_ENV === "production") {
    return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  }
  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

function client() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

/**
 * Create a PayPal order
 * @param {Object} params - { amount, currency, receipt, customId }
 * @returns {Promise<{ orderId: string }>}
 */
async function createOrder({ amount, currency = "USD", receipt, customId }) {
  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.headers["prefer"] = "return=representation";
  request.requestBody({
    intent: "CAPTURE",
    application_context: {
      brand_name: "Consultation",
      locale: "en-US",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
    },
    purchase_units: [
      {
        reference_id: receipt || customId || `ORD_${Date.now()}`,
        description: "Consultation Appointment Booking",
        amount: {
          currency_code: currency,
          value: String(Number(amount).toFixed(2)),
        },
      },
    ],
  });

  const response = await client().execute(request);
  return { orderId: response.result.id };
}

/**
 * Capture a PayPal order (after user approval)
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<{ captureId: string, status: string }>}
 */
async function captureOrder(orderId) {
  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  const response = await client().execute(request);
  const captureId =
    response.result.purchase_units?.[0]?.payments?.captures?.[0]?.id || response.result.id;
  return {
    captureId,
    status: response.result.status,
  };
}

module.exports = {
  createOrder,
  captureOrder,
  client,
};
