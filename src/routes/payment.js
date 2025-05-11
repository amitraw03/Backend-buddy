const express = require("express");
const { userAuth } = require("../middlewares/auth");
const razorpayInstance = require("../utils/razorpay");
const Payment = require("../models/payment");
const { BASE_PRICES, YEARLY_DISCOUNT } = require("../utils/constants");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const User = require("../models/user");
const paymentRouter = express.Router();

//Creation of Payment
paymentRouter.post("/create", userAuth, async (req, res) => {
  // destructuring
  const { membershipType, billingPeriod } = req.body;
  const { firstName, lastName, emailId } = req.user;

  try {
    // 1) Determine the amount in INR (before paise conversion)
    let unitPrice = BASE_PRICES[membershipType];
    if (!unitPrice) {
      return res.status(400).json({ error: "Invalid membership type" });
    }

    let inrAmount;
    if (billingPeriod === "yearly") {
      // 12 months with a 10% discount
      inrAmount = Math.round(unitPrice * 12 * (1 - YEARLY_DISCOUNT));
    } else {
      // monthly
      inrAmount = unitPrice;
    }
    const amountInPaise = inrAmount * 100;

    //creating a order
    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: "receipt#1",
      partial_payment: false,
      notes: {
        firstName,
        lastName,
        emailId,
        membershipType: membershipType,
      },
    });
    //  save orderid + details in D.B
    //  console.log(order);
    const payment = new Payment({
      userId: req.user._id,
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    });
    const savedPayment = await payment.save();

    //return it on frontend
    res.json({ ...savedPayment.toJSON(), keyId: process.env.RAZORPAY_ID });
  } catch (error) {
    res.status(400).send(`Payment creaton Failed:` + error.message);
  }
});

//Verification with real-time notifications
paymentRouter.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const payload = req.body.toString();
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Validate the webhook signature
    if (!validateWebhookSignature(payload, signature, secret)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const webhookData = JSON.parse(payload);

    // Only handle successful captures
    if (webhookData.event === "payment.captured") {
      const p = webhookData.payload.payment.entity;

      // Update payment record
      const payment = await Payment.findOne({ orderId: p.order_id });
      if (payment) {
        payment.status = p.status;
        await payment.save();

        // Mark user as premium
        const user = await User.findById(payment.userId);
        if (user) {
          user.isPremium = true;
          await user.save();
        }
      }
    }

    // Acknowledge receipt of the webhook
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

//just after verification return user is premium
paymentRouter.get("/premium-verify", userAuth, async (req, res) => {
  try {
    const user = req.user;
    if (user?.isPremium) {
      return res.status(200).json({ isPremium: true });
    }
    return res.status(200).json({ isPremium: false });
  } catch (error) {
    console.error("Premium verification failed:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = paymentRouter;
