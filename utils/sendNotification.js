//sendnotification utils
import Notification from "../models/Notification.model.js";

export const sendNotification = async ({
  userId,
  title,
  message,
  type,
}) => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
    });
  } catch (error) {
    console.error("Notification error:", error);
  }
};