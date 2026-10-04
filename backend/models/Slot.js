const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
    },
    levelName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["REGULAR", "EV", "VIP"],
      default: "REGULAR",
    },
    baseRate: {
      type: Number,
      required: true,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
    vehicleNumber: {
      type: String,
      default: null,
      trim: true,
    },
    entryTime: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Slot", slotSchema);