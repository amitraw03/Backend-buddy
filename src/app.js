const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const app = express();
const http = require("http"); // required to built connection

// const isProd = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: ["https://dev-buddy-eta.vercel.app" ,"http://localhost:5173"],
    credentials: true, // Allow credentials
  })
);

app.use(cookieParser()); //parse cookie from req

// ─── EXCLUDE WEBHOOK FROM JSON PARSING ─────────────────────────────────
app.use("/payment/webhook", bodyParser.raw({ type: "application/json" }));

// ─── PARSE JSON FOR EVERYTHING ELSE ────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRouter = require("./routes/auth.js");
const profileRouter = require("./routes/profile.js");
const requestRouter = require("./routes/requests.js");
const userRouter = require("./routes/user.js");
const paymentRouter = require("./routes/payment.js");
const chatRouter = require("./routes/chats.js");
const initialiseSocket = require("./utils/socket.js");

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/payment", paymentRouter);
app.use("/", chatRouter);

//Socket server created with existing app server
const server = http.createServer(app);
initialiseSocket(server);

connectDB()
  .then(() => {
    console.log(`DataBase connection stablished🔥`);
    server.listen(process.env.PORT || 3000, () => {
      console.log(`Server successfull listening on PORT:` + `3000`);
    });
  })
  .catch((err) => {
    console.error(`DB cn't be connected!!`, err.message);
  });
