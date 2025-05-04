const express = require("express");
const authRouter = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const { userAuth } = require("../middlewares/auth");

authRouter.post("/signup", async (req, res) => {
  const { firstName, lastName, emailId, password,gender , photoUrl } = req?.body;
  try {
    if (!firstName || !lastName) {
      throw new Error(`Enter the Name please!`);
    }

    //lets hash the password before saving in DB
    const hashPassword = await bcrypt.hash(password, 10);

    //creating dynamic instance of a user model
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: hashPassword,
      gender,
      photoUrl,
    });

    const savedUser = await user.save();
    const token = await user.getJWT();

    res.cookie("token", token, {
      httpOnly: true, // Helps prevent XSS attacks
      secure: false, // Should be false in development (no HTTPS)
      sameSite: "lax",
      expires: new Date(Date.now() + 8 * 3600000), // 8 hours
    });
    res.status(200).send(savedUser);
  } catch (error) {
    res.status(400).send(`Error occured:` + error.message);
  }
});

authRouter.post("/login", async (req, res) => {
  // console.log("Request Body:", req.body);

  const { emailId, password } = req.body;

  try {
    if (!emailId || !password) {
      throw new Error("Please provide both email and password.");
    }

    const user = await User.findOne({ emailId });
    if (!user) {
      throw new Error("User does not exist.");
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new Error("Incorrect password.");
    }

    const token = await user.getJWT();

    res.cookie("token", token, {
      httpOnly: true, // Helps prevent XSS attacks
      secure: false, // Should be false in development (no HTTPS)
      sameSite: "lax",
      expires: new Date(Date.now() + 8 * 3600000), // 8 hours
    });

    res.status(200).send(user);
  } catch (error) {
    res.status(400).send("Login failed: " + error.message);
  }
});

authRouter.post("/logout", userAuth, async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: false, // set to true in production when using HTTPS
    });
    res.status(200).send("User logged out successfully");
  } catch (error) {
    res.status(500).send("Logout failed: " + error.message);
  }
});

module.exports = authRouter;
