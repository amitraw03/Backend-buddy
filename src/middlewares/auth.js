const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
require("dotenv").config();

const userAuth = async (req, res, next) => {
  try {
    // Read token from req cookies
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Authentication required" });

    //validate the token & find the usser
    const { _id } = jwt.verify(token, process.env.TOKEN_SECRET);
    const user = await User.findById(_id);
    if (!user) return res.status(401).json({ message: "Invalid token" });

    //attach the user info to req
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = { userAuth };
