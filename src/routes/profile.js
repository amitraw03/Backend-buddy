const express = require("express");
const profileRouter = express.Router();
const validator = require("validator");
const bcrypt = require("bcrypt");
const { userAuth } = require("../middlewares/auth.js");
const User = require("../models/user.js");

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    res.send(req?.user);
  } catch (error) {
    res.status(400).send(`Error occured :` + error.message);
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    const updater = req?.body; //new data
    // lets perform API level validation like ony certain fields can be update
    const ALLOWED_UPDATES = ["photoUrl", "about", "age", "gender", "skills"];
    const isUpdateAllowed = Object.keys(updater).every((k) =>
      ALLOWED_UPDATES.includes(k)
    );
    if (!isUpdateAllowed) {
      throw new Error(`Updates not allowed`);
    }

    const loggedInUser = req?.user;
    Object.keys(updater).forEach((key) => {
      loggedInUser[key] = updater[key];
    });
    await loggedInUser.save();

    //professional way of sending data to client
    res.json({
      message: `porfile Data Updated Succesfully`,
      data: loggedInUser,
    });
  } catch (error) {
    res.status(400).send(`Update Failed:` + error.message);
  }
});

profileRouter.patch("/profile/reset-password", userAuth, async (req, res) => {
  try {
    const userId = req?.user._id;
    const { password } = req?.body;
    
    if (!password) {
      return res.status(400).send("Password is required.");
    }
    if (!validator.isStrongPassword(password)) {
      throw new Error(`please enter a strong password!`);
    }
    const newPasswordHash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(userId, { password: newPasswordHash });

    res.status(200).send("Password updated successfully.");
  } 
  catch (error) {
    res.status(400).send(`Update Failed:` + error.message);
  }
});

module.exports = profileRouter;
