const socket = require("socket.io");

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
    socket.on("sendMessage", ({ currId, targetId, text }) => {
      const roomId = [currId, targetId].sort().join("_");
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
