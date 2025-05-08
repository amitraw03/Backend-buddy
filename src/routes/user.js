const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");

const userRouter = express.Router();

const USER_SAFE_DATA = "firstName lastName age gender photoUrl about skills";

//API to get all interested connection requests of loggedInuser
userRouter.get("/user/requests-pending", userAuth, async (req, res) => {
  try {
    const loggedInUser = req?.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_DATA);

    res.json({
      message: `Pending Requests fetched Succesfully`,
      data: connectionRequests,
    });
  } catch (error) {
    res.status(400).send(`ERROR: ` + error.message);
  }
});

//API to get all connected connections of loggedInUser
userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUserId = req?.user._id;

    //to fetch accepted connections
    const acceptedRequests = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedInUserId, status: "accepted" },
        { fromUserId: loggedInUserId, status: "accepted" },
      ],
    })
      .populate("fromUserId", USER_SAFE_DATA)
      .populate("toUserId", USER_SAFE_DATA);
    //why 2 populates? cause loggedInUser could be either fromUserId or either toUserID

    //for more simplified and only requirede data
    const requiredData = acceptedRequests.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUserId.toString()) {
        return row.toUserId;
      }
      return row.fromUserId;
    });

    res.json({
      message: `Connections Fetched Succesfully`,
      data: requiredData,
    });
  } catch (error) {
    res.status(400).send(`ERROR in fetching connected Connections :`+ error.message);
  }
});

//feed API for loggedInUSer 
userRouter.get("/user/feed", userAuth, async (req, res) => {
  try {
    const loggedInUSer = req?.user;
    // below pagination logic using .skip() and .limit()
    const page = parseInt(req.query.page) || 1; 
    let limit = parseInt(req.query.limit) || 10; 
    limit = limit > 50 ? 50 : limit;
    const skip = (page-1)*limit;


    //logic is [total Users - everyUser involved in Connectn Req of loggedinUSer]
    //(1)Find all Connectn Reqsts [sent+Received]
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUSer._id }, { toUserId: loggedInUSer._id }],
    }).select("fromUserId toUserId");

    //(2) store in set D.S of uniquely involved userIds
    const hideUsersFromFeed = new Set();
    connectionRequests.map((req) => {
        hideUsersFromFeed.add(req.fromUserId.toString()),
        hideUsersFromFeed.add(req.toUserId.toString());
    });
    // console.log(hideUsersFromFeed);  
    //(3) Resultant Array to store feedUsers for loggedInUser
       // $nin-> not in Array  $ne--> not equal
    const feedUsers = await User.find({
      $and: [
        {
          _id: { $nin: Array.from(hideUsersFromFeed) },
        },
        { _id: { $ne: loggedInUSer._id } },
      ],
    }).select(USER_SAFE_DATA).skip(skip).limit(limit);

    res.send(feedUsers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = userRouter;
