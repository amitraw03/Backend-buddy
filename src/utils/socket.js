const socket = require("socket.io");
const Chat = require("../models/chat");

const initialiseSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: [process.env.CORS_ORIGIN, "https://dev-buddy-eta.vercel.app"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    //Handle Events

    socket.on("joinChat", ({ currId, targetId }) => {
      //by creating a roomId for these 2 with unique id
      const roomId = [currId, targetId].sort().join("_");
      socket.join(roomId);
    });

    // In your socket initialization file
    socket.on("sendMessage", async ({ currId, targetId, text }) => {
      const roomId = [currId, targetId].sort().join("_");
      //before emit info, save msges into the D.B
      try {
        let chat = await Chat.findOne({
          participants: { $all: [currId, targetId] },
        });
        // if chat already dont exist
        if (!chat) {
          chat = new Chat({
            participants: [userId, targetId],
            messages: [],
          });
        }
        // logic for addon on existing ones
        chat.messages.push({
          senderId: currId,
          text,
          timestamp: new Date(),
        });
        await chat.save();
      } catch (error) {
        console.log(`Chat handler Error: ` + error);
      }
      //emit to everyone in room
      io.to(roomId).emit("messageReceived", {
        senderId: currId,
        text,
        timestamp: new Date(),
      });
    });

    //handling disconnect event
    socket.on("disconnect", () => {});
  });
};

module.exports = initialiseSocket;
