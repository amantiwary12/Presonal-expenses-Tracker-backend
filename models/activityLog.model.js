const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  action: String,

  entity: String,

  entityId: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});