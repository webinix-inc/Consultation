const Razorpay = require("razorpay");
const crypto = require("crypto");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");
const Transaction = require("../../../models/transaction.model");

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/**
 * Create Razorpay order for appointment booking
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { amount, appointmentId, consultantId, clientId } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) {
      throw new ApiError("Invalid amount", httpStatus.BAD_REQUEST);
    }

    if (!appointmentId) {
      throw new ApiError("Appointment ID is required", httpStatus.BAD_REQUEST);
    }

    // Convert amount to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    // Generate receipt - must be max 40 characters (Razorpay requirement)
    // Format: APPT + last 12 chars of appointmentId + timestamp (last 8 digits)
    // This ensures we stay under 40 chars: APPT (4) + _ (1) + 12 chars + _ (1) + 8 digits = 26 chars
    const appointmentIdStr = String(appointmentId);
    const shortApptId = appointmentIdStr.length > 12 ? appointmentIdStr.slice(-12) : appointmentIdStr;
    const timestamp = String(Date.now()).slice(-8); // Last 8 digits of timestamp
    const receipt = `APPT_${shortApptId}_${timestamp}`.substring(0, 40); // Ensure max 40 chars

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt,
      notes: {
        appointmentId: appointmentId,
        consultantId: consultantId || "",
        clientId: clientId || user._id || user.id,
        userId: user._id || user.id,
      },
    };

    const order = await razorpay.orders.create(options);

    // Check if a pending transaction already exists for this appointment
    let transaction = await Transaction.findOne({
      appointment: appointmentId,
      status: "Pending",
      type: "Payment"
    });

    // Calculate Commission
    let platformFee = 0;
    let netAmount = amount;

    if (consultantId) {
      try {
        const { Consultant } = require("../../../models/consultant.model");
        const consultantDoc = await Consultant.findById(consultantId);
        if (consultantDoc && consultantDoc.commission && consultantDoc.commission.platformPercent > 0) {
          const percent = consultantDoc.commission.platformPercent;
          platformFee = Math.round((amount * percent) / 100);
          netAmount = amount - platformFee;
        }
      } catch (err) {
        console.error("Error calculating commission:", err);
        // Default to 0 fee if error
      }
    }

    if (transaction) {
      // Update existing transaction with new order details
      transaction.transactionId = order.id;
      transaction.amount = amount;
      transaction.platformFee = platformFee;
      transaction.netAmount = netAmount;
      transaction.metadata = {
        ...transaction.metadata,
        razorpayOrderId: order.id,
        razorpayReceipt: order.receipt,
      };
      await transaction.save();
    } else {
      // Create pending transaction record
      transaction = await Transaction.create({
        user: clientId || user._id || user.id,
        consultant: consultantId || null,
        appointment: appointmentId || null,
        amount: amount,
        platformFee: platformFee,
        netAmount: netAmount,
        currency: "INR",
        type: "Payment",
        status: "Pending",
        paymentMethod: "Razorpay",
        transactionId: order.id,
        metadata: {
          razorpayOrderId: order.id,
          razorpayReceipt: order.receipt,
        },
      });
    }

    return sendSuccess(res, "Order created successfully", {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(error.message || "Failed to create order", httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
};

/**
 * Verify Razorpay payment and update transaction/appointment
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId, appointmentId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ApiError("Missing payment verification data", httpStatus.BAD_REQUEST);
    }

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      throw new ApiError("Invalid payment signature", httpStatus.BAD_REQUEST);
    }

    // Fetch transaction
    let transaction = null;
    if (transactionId) {
      transaction = await Transaction.findById(transactionId);
    } else {
      // Find by razorpay order ID
      transaction = await Transaction.findOne({
        "metadata.razorpayOrderId": razorpay_order_id,
      });
    }

    if (!transaction) {
      throw new ApiError("Transaction not found", httpStatus.NOT_FOUND);
    }

    // Update transaction with payment details
    transaction.status = "Success";
    transaction.transactionId = razorpay_payment_id;
    transaction.metadata = {
      ...transaction.metadata,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      verifiedAt: new Date(),
    };
    await transaction.save();

    // Update appointment payment status if appointmentId is provided
    if (appointmentId) {
      const Appointment = require("../../../models/appointment.model");
      const appointment = await Appointment.findById(appointmentId);

      if (appointment) {
        appointment.payment = {
          amount: transaction.amount,
          status: "Success",
          method: "Razorpay",
          transactionId: transaction._id,
        };
        appointment.fee = transaction.amount; // Also set fee field
        appointment.status = "Upcoming";
        await appointment.save();

        // Send notifications for confirmed appointment
        try {
          const Notification = require("../../../models/notification.model");
          const User = require("../../../models/user.model");

          const client = await User.findById(appointment.client);
          const consultant = await User.findById(appointment.consultant);

          const clientName = client?.fullName || "Client";
          const consultantName = consultant?.fullName || "Consultant";

          // Notification for Consultant
          await Notification.create({
            name: "Appointment Confirmed",
            message: `Appointment with ${clientName} is confirmed on ${appointment.date} at ${appointment.timeStart}.`,
            recipient: appointment.consultant,
            recipientRole: "Consultant",
            type: "appointment",
            avatar: client?.avatar || client?.profileImage || "https://via.placeholder.com/40"
          });

          // Notification for Client
          await Notification.create({
            name: "Appointment Confirmed",
            message: `Your appointment with ${consultantName} is confirmed on ${appointment.date} at ${appointment.timeStart}.`,
            recipient: appointment.client,
            recipientRole: "Client",
            type: "appointment",
            avatar: consultant?.avatar || consultant?.profileImage || "https://via.placeholder.com/40"
          });
        } catch (notifErr) {
          console.error("Failed to create payment confirmation notifications:", notifErr);
        }
      }
    }

    return sendSuccess(res, "Payment verified successfully", {
      transactionId: transaction._id,
      paymentId: razorpay_payment_id,
      status: "Success",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(error.message || "Failed to verify payment", httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
};

/**
 * Get payment status
 */
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { transactionId, orderId } = req.query;

    let transaction = null;
    if (transactionId) {
      transaction = await Transaction.findById(transactionId);
    } else if (orderId) {
      transaction = await Transaction.findOne({
        "metadata.razorpayOrderId": orderId,
      });
    }

    if (!transaction) {
      throw new ApiError("Transaction not found", httpStatus.NOT_FOUND);
    }

    return sendSuccess(res, "Payment status fetched", {
      transactionId: transaction._id,
      status: transaction.status,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod,
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(error.message || "Failed to fetch payment status", httpStatus.INTERNAL_SERVER_ERROR));
    }
  }
};

