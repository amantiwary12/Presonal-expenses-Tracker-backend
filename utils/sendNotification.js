//sendnotification utils
import Notification from "../models/Notification.model.js";
import { emitToUser } from "./socket.js";

export const sendNotification = async ({
  userId,
  title,
  message,
  type,
}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
    });

    emitToUser(userId, "notification:new", notification);
  } catch (error) {
    console.error("Notification error:", error);
  }
};