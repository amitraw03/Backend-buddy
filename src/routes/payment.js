const express = require("express");
const { userAuth } = require("../middlewares/auth");
const razorpayInstance = require("../utils/razorpay");
const Payment = require("../models/payment");
const { BASE_PRICES, YEARLY_DISCOUNT } = require("../utils/constants");
const paymentRouter = express.Router();

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

module.exports = paymentRouter;
