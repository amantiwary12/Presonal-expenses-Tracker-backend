import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // console.log("MONGO_URI:", process.env.MONGO_URL);

    await mongoose.connect(process.env.MONGO_URL);

    console.log("Database connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default connectDB;