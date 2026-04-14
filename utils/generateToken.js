import jwt from "jsonwebtoken";

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET_KEY,
    console.log("SIGN SECRET:", process.env.JWT_SECRET_KEY),
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
};

export default generateToken;