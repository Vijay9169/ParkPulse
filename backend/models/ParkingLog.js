const mongoose = require("mongoose");

const parkingLogSchema = new mongoose.Schema(
  {
    vehicleNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    slotId: {
      type: String,
      required: true,
    },
    floor: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    entryTime: {
      type: Date,
      required: true,
    },
    exitTime: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    billableHours: {
      type: Number,
      required: true,
    },
    ratePerHour: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    isGracePeriod: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // isse createdAt aur updatedAt date-wise automatically save hote rahenge
  }
);

module.exports = mongoose.model("ParkingLog", parkingLogSchema);