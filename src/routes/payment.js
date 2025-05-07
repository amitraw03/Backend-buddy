const express = require("express");
const bodyParser = require("body-parser");
const { userAuth } = require("../middlewares/auth");
const razorpayInstance = require("../utils/razorpay");
const Payment = require("../models/payment");
const { BASE_PRICES, YEARLY_DISCOUNT } = require("../utils/constants");
const {validateWebhookSignature,} = require("razorpay/dist/utils/razorpay-utils");
const User = require("../models/user");
const paymentRouter = express.Router();

//Creation of Payment
paymentRouter.post("/payment/create", userAuth, async (req, res) => {
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
paymentRouter.post(
  "/payment/webhook",
  bodyParser.raw({ type: "application/json" }), // Keep raw body for signature verification
  async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    try {
      // Get signature from headers using req.get()
      const signature = req.get("X-Razorpay-Signature");
      
      if (!signature) {
        console.error("Webhook Error: Missing Razorpay signature");
        return res.status(400).json({ 
          success: false, 
          message: "Missing webhook signature" 
        });
      }

      // Verify webhook signature
      const isValid = validateWebhookSignature(
        req.body.toString(),
        signature,
        secret
      );

      if (!isValid) {
        console.error("Webhook Error: Invalid signature");
        return res.status(400).json({ 
          success: false, 
          message: "Invalid webhook signature" 
        });
      }

      // Parse webhook data
      const webhookData = JSON.parse(req.body.toString());
      console.log("Webhook received:", webhookData.event);

      // Handle different webhook events
      if (webhookData.event === "payment.captured" || webhookData.event === "payment.authorized") {
        const paymentInfo = webhookData.payload.payment.entity;
        const orderId = paymentInfo.order_id;

        if (!orderId) {
          console.error("Webhook Error: Missing order ID in payment info");
          return res.status(400).json({ 
            success: false, 
            message: "Missing order ID" 
          });
        }

        // Find and update payment record
        const payment = await Payment.findOne({ orderId });
        if (!payment) {
          console.error(`Webhook Error: Payment not found for order ${orderId}`);
          return res.status(404).json({ 
            success: false, 
            message: "Payment not found" 
          });
        }

        // Update payment status
        payment.status = paymentInfo.status;
        payment.paymentId = paymentInfo.id; // Store Razorpay payment ID
        
        // Save payment updates
        await payment.save();
        console.log(`Payment ${paymentInfo.id} updated with status: ${paymentInfo.status}`);

        // Update user's premium status
        const user = await User.findById(payment.userId);
        if (!user) {
          console.error(`Webhook Error: User not found for payment ${payment._id}`);
          return res.status(404).json({ 
            success: false, 
            message: "User not found" 
          });
        }

        // Set user to premium
        user.isPremium = true;
        await user.save();
        console.log(`User ${user._id} updated to premium status`);
      } 
      else if (webhookData.event === "payment.failed") {
        // Handle payment failure
        const paymentInfo = webhookData.payload.payment.entity;
        console.log(`Payment failed for order ${paymentInfo.order_id}`);
        
        // Update payment status
        const payment = await Payment.findOne({ orderId: paymentInfo.order_id });
        if (payment) {
          payment.status = "failed";
          await payment.save();
        }
      }

      // Always return 200 for webhooks to prevent retries
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Webhook handler error:", error.message, error.stack);
      
      // Always return 200 for webhooks, even on error, to prevent Razorpay retries
      // We'll handle errors internally and debug through logs
      return res.status(200).json({ 
        success: true,
        message: "Webhook received with errors" 
      });
    }
  }
);

//just after verification return user is premium
paymentRouter.get("/premium/verify", userAuth, async (req, res) => {
  try {
    const user = req.user;
    if (user.isPremium) {
      return res.status(200).json({ isPremium: true });
    }
    return res.status(200).json({ isPremium: false });
  } catch (error) {
    console.error("Premium verification failed:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


module.exports = paymentRouter;
