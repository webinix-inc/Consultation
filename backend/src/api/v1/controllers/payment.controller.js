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
    const { amount, appointmentId, holdId, consultantId, clientId, currency: reqCurrency } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) {
      throw new ApiError("Invalid amount", httpStatus.BAD_REQUEST);
    }

    if (!appointmentId && !holdId) {
      throw new ApiError("Appointment ID or Hold ID is required", httpStatus.BAD_REQUEST);
    }

    // Determine Currency
    let currency = reqCurrency || "INR";
    let platformFee = 0;
    let netAmount = amount;

    if (consultantId) {
      try {
        const { Consultant } = require("../../../models/consultant.model");
        const consultantDoc = await Consultant.findById(consultantId);

        // If currency not provided in request, try to use consultant's currency
        if (!reqCurrency && consultantDoc && consultantDoc.currency) {
          currency = consultantDoc.currency;
        }

        if (consultantDoc && consultantDoc.commission && consultantDoc.commission.platformPercent > 0) {
          const percent = consultantDoc.commission.platformPercent;
          platformFee = Math.round((amount * percent) / 100);
          netAmount = amount - platformFee;
        }
      } catch (err) {
        console.error("Error fetching consultant for currency/commission:", err);
      }
    }

    // Convert amount to smallest currency unit (paise/cents)
    // Razorpay supports most currencies with 100 subdivision
    const amountInSmallestUnit = Math.round(amount * 100);

    // Generate receipt
    let receiptPrefix = "APPT";
    let idStr = String(appointmentId || "");
    if (holdId) {
      receiptPrefix = "HOLD";
      idStr = String(holdId);
    }

    // Format: TYPE + last 12 chars of ID + timestamp (last 8 digits)
    const shortId = idStr.length > 12 ? idStr.slice(-12) : idStr;
    const timestamp = String(Date.now()).slice(-8); // Last 8 digits of timestamp
    // Prefix (4) + _ (1) + 12 chars + _ (1) + 8 digits = 26 chars
    const receipt = `${receiptPrefix}_${shortId}_${timestamp}`.substring(0, 40);

    // Create Razorpay order
    const options = {
      amount: amountInSmallestUnit,
      currency: currency,
      receipt: receipt,
      notes: {
        appointmentId: appointmentId || "",
        holdId: holdId || "",
        consultantId: consultantId || "",
        clientId: clientId || user._id || user.id,
        userId: user._id || user.id,
      },
    };

    const order = await razorpay.orders.create(options);

    // Check if a pending transaction already exists
    let transaction = null;

    // Only search for existing pending transaction if we have an appointmentId
    // If it's a hold, we likely create a new transaction every time as holds are temporary
    if (appointmentId) {
      transaction = await Transaction.findOne({
        appointment: appointmentId,
        status: "Pending",
        type: "Payment"
      });
    }

    if (transaction) {
      // Update existing transaction with new order details
      transaction.transactionId = order.id;
      transaction.amount = amount;
      transaction.platformFee = platformFee;
      transaction.netAmount = netAmount;
      transaction.currency = currency; // Update currency
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
        currency: currency,
        type: "Payment",
        status: "Pending",
        paymentMethod: "Razorpay",
        transactionId: order.id,
        metadata: {
          razorpayOrderId: order.id,
          razorpayReceipt: order.receipt,
          holdId: holdId || null,
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

        // Send notifications for confirmed appointment using NotificationService
        try {
          const NotificationService = require("../../../services/notificationService");
          const User = require("../../../models/user.model");
          const Client = require("../../../models/client.model");

          // Get client name
          let client = await Client.findById(appointment.client);
          if (!client) client = await User.findById(appointment.client);
          const clientName = client?.fullName || "Client";

          // Get consultant name
          const consultantUser = await User.findById(appointment.consultant);
          let consultantName = consultantUser?.fullName || consultantUser?.name || consultantUser?.displayName || "Consultant";

          // Try to get better name from Consultant profile if possible
          if (consultantName === "Consultant") {
            const ConsultantModel = require("../../../models/consultant.model").Consultant;
            const consultantProfile = await ConsultantModel.findOne({ user: appointment.consultant });
            if (consultantProfile) {
              const combinedName = `${consultantProfile.firstName || ""} ${consultantProfile.lastName || ""}`.trim();
              consultantName = consultantProfile.name || consultantProfile.fullName || consultantProfile.displayName || combinedName || consultantName;
            } else {
              // Fallback 2: Check if appointment.consultant is directly the Consultant Profile ID (not User ID)
              const consultantProfileDirect = await ConsultantModel.findById(appointment.consultant);
              if (consultantProfileDirect) {
                const combinedName = `${consultantProfileDirect.firstName || ""} ${consultantProfileDirect.lastName || ""}`.trim();
                consultantName = consultantProfileDirect.name || consultantProfileDirect.fullName || consultantProfileDirect.displayName || combinedName || consultantName;
              }
            }
          }

          // Payment success notification for client
          await NotificationService.notifyPaymentSuccess(
            { ...transaction.toObject(), user: appointment.client },
            clientName
          );

          // Payment received notification for consultant - REMOVED (Agency Model)
          // instead notify Admin
          try {
            await NotificationService.notifyAdminPaymentReceived(
              transaction.toObject(),
              clientName,
              consultantName
            );
          } catch (adminNotifErr) {
            console.error("Failed to send admin payment notification:", adminNotifErr);
          }

          // Appointment confirmed notifications
          await NotificationService.notifyAppointmentBooked(
            { ...appointment.toObject(), date: appointment.date, timeStart: appointment.timeStart },
            clientName,
            consultantName
          );
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

