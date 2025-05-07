const mongoose = require("mongoose");
const { Schema } = mongoose;
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const validator = require("validator");
require('dotenv').config();

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 20,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error(`Invalid email Address:` + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      unique: true,
      validate(value) {
        if (!validator.isStrongPassword(value)) {
          throw new Error(`please enter a Strong Password!`);
        }
      },
    },
    age: {
      type: Number,
      default:18,
    },
    gender: {
      type: String,
      required:true,
      enum: ["male", "female", "other"],
    },
    isPremium:{
      type:Boolean,
      default:false
    },
    skills: {
      type: [String],
    },
    about: {
      type: String,
      default: "this is a default about description of user",
    },
    photoUrl: {
      type: String,
      default:
        process.env.IMG_URL,
      validate(value) {
        if (!validator.isURL(value)) {
          throw new Error(`Invalid photoUrl:` + value);
        }
      },
    },
  },
  { timestamps: true }
);


userSchema.methods.getJWT = async function () {
   const user = this;
   const token = await jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET , {
    expiresIn: "1h",
  });
  return token;
};

userSchema.methods.validatePassword = async function (password){
    const user= this;
    const isPasswordValid= await bcrypt.compare(password, user.password);
    return isPasswordValid;
}

const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;
