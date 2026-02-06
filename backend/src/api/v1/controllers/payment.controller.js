const Razorpay = require("razorpay");
const crypto = require("crypto");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");
const Transaction = require("../../../models/transaction.model");
const paypalService = require("../../../services/paypal.service");

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/**
 * Create order for appointment booking (Razorpay or PayPal)
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { amount, appointmentId, holdId, consultantId, clientId, currency: reqCurrency, paymentMethod } = req.body;
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

    // Generate receipt
    let receiptPrefix = "APPT";
    let idStr = String(appointmentId || "");
    if (holdId) {
      receiptPrefix = "HOLD";
      idStr = String(holdId);
    }
    const shortId = idStr.length > 12 ? idStr.slice(-12) : idStr;
    const timestamp = String(Date.now()).slice(-8);
    const receipt = `${receiptPrefix}_${shortId}_${timestamp}`.substring(0, 40);

    const isPayPal = paymentMethod === "PayPal";

    if (isPayPal) {
      // PayPal: use USD if INR (PayPal sandbox prefers USD)
      const paypalCurrency = currency === "INR" ? "USD" : currency;
      const { orderId } = await paypalService.createOrder({
        amount,
        currency: paypalCurrency,
        receipt,
        customId: holdId || appointmentId,
      });

      let transaction = await Transaction.findOne({
        appointment: appointmentId,
        status: "Pending",
        type: "Payment",
      });

      if (!transaction && !appointmentId) {
        transaction = null;
      }

      if (transaction) {
        transaction.transactionId = orderId;
        transaction.amount = amount;
        transaction.platformFee = platformFee;
        transaction.netAmount = netAmount;
        transaction.currency = currency;
        transaction.paymentMethod = "PayPal";
        transaction.metadata = { ...transaction.metadata, paypalOrderId: orderId, holdId: holdId || null };
        await transaction.save();
      } else {
        transaction = await Transaction.create({
          user: clientId || user._id || user.id,
          consultant: consultantId || null,
          appointment: appointmentId || null,
          amount,
          platformFee,
          netAmount,
          currency,
          type: "Payment",
          status: "Pending",
          paymentMethod: "PayPal",
          transactionId: orderId,
          metadata: { paypalOrderId: orderId, holdId: holdId || null },
        });
      }

      return sendSuccess(res, "Order created successfully", {
        orderId,
        amount,
        currency: paypalCurrency,
        paymentMethod: "PayPal",
        transactionId: transaction._id,
      });
    }

    // Razorpay flow
    const amountInSmallestUnit = Math.round(amount * 100);
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

    let transaction = null;
    if (appointmentId) {
      transaction = await Transaction.findOne({
        appointment: appointmentId,
        status: "Pending",
        type: "Payment"
      });
    }

    if (transaction) {
      transaction.transactionId = order.id;
      transaction.amount = amount;
      transaction.platformFee = platformFee;
      transaction.netAmount = netAmount;
      transaction.currency = currency;
      transaction.metadata = {
        ...transaction.metadata,
        razorpayOrderId: order.id,
        razorpayReceipt: order.receipt,
      };
      await transaction.save();
    } else {
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
 * Verify payment (Razorpay or PayPal) and update transaction/appointment
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transactionId,
      appointmentId,
      paymentMethod,
      orderID: paypalOrderId,
    } = req.body;

    const isPayPal = paymentMethod === "PayPal";

    let transaction = null;

    if (isPayPal) {
      if (!paypalOrderId) {
        throw new ApiError("Missing PayPal order ID", httpStatus.BAD_REQUEST);
      }
      const { captureId } = await paypalService.captureOrder(paypalOrderId);

      if (transactionId) {
        transaction = await Transaction.findById(transactionId);
      } else {
        transaction = await Transaction.findOne({
          "metadata.paypalOrderId": paypalOrderId,
        });
      }

      if (!transaction) {
        throw new ApiError("Transaction not found", httpStatus.NOT_FOUND);
      }

      transaction.status = "Success";
      transaction.transactionId = captureId;
      transaction.metadata = {
        ...transaction.metadata,
        paypalOrderId,
        paypalCaptureId: captureId,
        verifiedAt: new Date(),
      };
      await transaction.save();
    } else {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError("Missing payment verification data", httpStatus.BAD_REQUEST);
      }

      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(text)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        throw new ApiError("Invalid payment signature", httpStatus.BAD_REQUEST);
      }

      if (transactionId) {
        transaction = await Transaction.findById(transactionId);
      } else {
        transaction = await Transaction.findOne({
          "metadata.razorpayOrderId": razorpay_order_id,
        });
      }

      if (!transaction) {
        throw new ApiError("Transaction not found", httpStatus.NOT_FOUND);
      }

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
    }

    // Update appointment payment status if appointmentId is provided
    if (appointmentId) {
      const Appointment = require("../../../models/appointment.model");
      const appointment = await Appointment.findById(appointmentId);

      if (appointment) {
        // Link transaction to appointment if not already (e.g. hold flow)
        if (!transaction.appointment) {
          transaction.appointment = appointmentId;
          await transaction.save();
        }

        // Get client and consultant for invoice and notifications
        const User = require("../../../models/user.model");
        const Client = require("../../../models/client.model");
        const { Consultant: ConsultantModel } = require("../../../models/consultant.model");

        let client = await Client.findById(appointment.client);
        if (!client) client = await User.findById(appointment.client);
        const clientName = client?.fullName || client?.name || "Client";

        let consultantProfile = await ConsultantModel.findOne({ user: appointment.consultant });
        if (!consultantProfile) consultantProfile = await ConsultantModel.findById(appointment.consultant);
        const consultantUser = await User.findById(appointment.consultant);
        const consultant = consultantProfile || consultantUser || appointment.consultantSnapshot;
        let consultantName = consultant?.fullName || consultant?.name || consultant?.displayName || appointment.consultantSnapshot?.name || "Consultant";
        if (consultantName === "Consultant" && consultantProfile) {
          const combinedName = `${consultantProfile.firstName || ""} ${consultantProfile.lastName || ""}`.trim();
          consultantName = consultantProfile.name || consultantProfile.fullName || consultantProfile.displayName || combinedName || consultantName;
        }

        // Update transaction snapshots if missing (for invoice generation)
        if (!transaction.userSnapshot && client) {
          transaction.userSnapshot = {
            name: client.fullName || client.name,
            email: client.email || "",
            mobile: client.mobile || client.phone || "",
          };
        }
        if (!transaction.consultantSnapshot && consultant) {
          transaction.consultantSnapshot = {
            name: consultant.fullName || consultant.name || consultant.displayName || consultantName,
            email: consultant.email || "",
            mobile: consultant.mobile || consultant.phone || "",
            category: consultant.category?.name || consultant.category || "General",
            subcategory: consultant.subcategory?.name || consultant.subcategory || "",
          };
        }
        if (transaction.isModified()) await transaction.save();

        // Generate invoice and set invoiceUrl
        try {
          const invoiceService = require("../../../services/invoice.service");
          const invoiceConsultant = {
            name: consultant?.fullName || consultant?.name || consultant?.displayName || consultantName,
            email: consultant?.email,
            mobile: consultant?.mobile || consultant?.phone,
          };
          const invoiceUrl = await invoiceService.generateInvoice(transaction, appointment, client, invoiceConsultant);
          transaction.invoiceUrl = invoiceUrl;
          await transaction.save({ validateBeforeSave: false });

          appointment.payment = {
            amount: transaction.amount,
            status: "Success",
            method: transaction.paymentMethod || "Razorpay",
            transactionId: transaction._id,
            invoiceUrl,
          };
        } catch (invErr) {
          console.error("❌ Invoice generation failed in verifyPayment:", invErr);
          appointment.payment = {
            amount: transaction.amount,
            status: "Success",
            method: transaction.paymentMethod || "Razorpay",
            transactionId: transaction._id,
          };
        }

        appointment.fee = transaction.amount;
        appointment.status = "Upcoming";
        await appointment.save();

        // Send notifications for confirmed appointment using NotificationService
        try {
          const NotificationService = require("../../../services/notificationService");

          await NotificationService.notifyPaymentSuccess(
            { ...transaction.toObject(), user: appointment.client },
            clientName
          );

          try {
            await NotificationService.notifyAdminPaymentReceived(
              transaction.toObject(),
              clientName,
              consultantName
            );
          } catch (adminNotifErr) {
            console.error("Failed to send admin payment notification:", adminNotifErr);
          }

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
      paymentId: transaction.transactionId,
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
        $or: [
          { "metadata.razorpayOrderId": orderId },
          { "metadata.paypalOrderId": orderId },
        ],
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

