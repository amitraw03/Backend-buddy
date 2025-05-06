const express = require("express");
const { userAuth } = require("../middlewares/auth");
const razorpayInstance = require("../utils/razorpay");
const paymentRouter = express.Router();


paymentRouter.post("/payment/create", userAuth, async(req,res)=>{
     try {
      //creating a order
      const order= await razorpayInstance.orders.create({
          "amount": 20000,
          "currency":"INR",
          "receipt":"receipt#1",
          "partial_payment":false,
          "notes":{
            "firstName":"firstName",
            "lastName":"amount",
            "membershipType":"silver",
          },
      });
      //  save orderid + details in D.B
      console.log(order);

      //return it on frontend
      res.json({order});
        
     } catch (error) {
        res.status(400).send(`Payment creaton Failed:` + error.message);
     }
})


module.exports= paymentRouter;