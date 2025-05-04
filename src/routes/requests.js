const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
const requestRouter = express.Router();

// Send request route (INITIATE)
requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      //sender ID
      const fromUserId = req?.user._id;
      // target ID
      const toUserId = req.params.toUserId;
      const status = req.params.status; // interest or ignore

      //(1) to validate and make sure fromUserId!=toUserID using Schema Validation using 'pre'

      //(2) to validate status can't be randomed
      const allowedStatus = ["interested", "ignored"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ message: `this status:` + status + `not allowed!!` });
      }

      //(3) to validate the target user is actually exist in D.B or not
      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res
          .status(400)
          .send(`Such User with userID` + toUserId + `doesn't Exist`);
      }

      //(4)  to validate uniqueness of both parties while making a connection
      const existingConnectionRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });
      if (existingConnectionRequest) {
        return res.status(400).send(`Connection request already exists!!`);
      }

      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });
      const info = await connectionRequest.save();

      res.json({
        message: `Request Sent successfully!!`,
        data:info,
      });
    } catch (error) {
      res.status(400).send(`ERROR: ` + error.message);
    }
  }
);

// Respond to request route (ACCEPT/REJECT)
requestRouter.post(
  "/request/respond/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const loggedInUser = req?.user;
      const requestId = req.params.requestId; //requestId is the collection Id of connecReq
      const status = req.params.status; 

      //validate status & connectReq existence
      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ message: `this status: ${status}  not allowed!!` });
      }

      const existingConnectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });
      if (!existingConnectionRequest) {
        return res.status(404).send(`Connection request doesn't exist!!`);
      }
      
      //here reached i.e present-->update status
      existingConnectionRequest.status = status;
      const info = await existingConnectionRequest.save();

      res.json({
        message: `Response Sent successfully!!`,
        data :info,
      });
    } catch (error) {
      res.status(400).send(`ERROR: ` + error.message);
    }
  }
);

module.exports = requestRouter;
