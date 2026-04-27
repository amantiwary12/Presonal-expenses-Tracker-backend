//company model
import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: String,

  phone: String,

  address: String,

  isActive: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Company =
  mongoose.models.Company ||
  mongoose.model("Company", companySchema);

export default Company;