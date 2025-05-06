const express = require("express");
const cors = require("cors");
require('dotenv').config();
const { connectDB } = require("./config/database");
const User = require("./models/user.js");
const cookieParser = require("cookie-parser");
const app = express();

app.use(cors({
  origin: [
    process.env.CORS_ORIGIN,
    "https://dev-buddy-eta.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json()); // express middleware to parse json data into jsObj in server coming from client
app.use(cookieParser()); // to read the cookie from req

const authRouter = require("./routes/auth.js");
const profileRouter= require("./routes/profile.js");
const requestRouter = require("./routes/requests.js");
const userRouter = require("./routes/user.js");
const paymentRouter = require("./routes/payment.js");


app.use("/",authRouter);
app.use("/",profileRouter);
app.use("/",requestRouter);
app.use("/",userRouter);
app.use("/",paymentRouter);

// //  /delete to delete a user
// app.delete("/delete", userAuth, async (req, res) => {
//   const userId = req.body?.userId;
//   try {
//     // await User.findByIdAndDelete({_id: userId});
//     await User.findByIdAndDelete(userId);
//     res.send(`User deleted successfully!`);
//   } catch (error) {
//     res.status(404).send(`Something went wrong`);
//   }
// });


connectDB()
  .then(() => {
    console.log(`DataBase connection stablished🔥`);
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server successfull listening on PORT:` + `3000`);
    });
  })
  .catch((err) => {
    console.error(`DB cn't be connected!!`, err.message);
  });
