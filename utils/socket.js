import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

let io = null;

const companyRoom = (companyId) => `company:${(companyId?._id || companyId).toString()}`;
const userRoom = (userId) => `user:${(userId?._id || userId).toString()}`;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const user = await User.findById(decoded.id).select("-password").populate("company");
      if (!user) return next(new Error("User not found"));

      socket.user = {
        _id: user._id,
        role: user.role,
        company: user.company,
      };
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    if (socket.user.company) {
      socket.join(companyRoom(socket.user.company));
    }
    socket.join(userRoom(socket.user._id));
  });

  return io;
};

export const getIO = () => io;

// Broadcasts to every user in the same company (all connected clients/tabs).
export const emitToCompany = (companyId, event, payload) => {
  if (!io || !companyId) return;
  io.to(companyRoom(companyId)).emit(event, payload);
};

// Sends to just one user (e.g. personal notifications).
export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
};
