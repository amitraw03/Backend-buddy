const express = require("express");
const { userAuth } = require("../middlewares/auth");
const Chat = require("../models/chat");
const chatRouter = express.Router();

// to fetch all the chats related to currID i.e loggedinUser
chatRouter.get("/chat/:targetId", userAuth, async (req, res) => {
  const { targetId } = req.params;
  const userId = req.user?._id;
  try {
    let chat = await Chat.findOne({
      participants: { $all: [userId, targetId] },
    }).populate({
      path: "messages.senderId",
      select: "firstName lastName",
    });

    if (!chat) {
      chat = new Chat({
        participants: [userId, targetId],
        messages: [],
      });
    }

    await chat.save();
    // return on frontend
    res.json(chat);
  } catch (error) {
    res.status(400).json(`Error in fetching chats: ${error.message}`);
  }
});

module.exports = chatRouter;
