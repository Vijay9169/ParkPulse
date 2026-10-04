require("dotenv").config();
const mongoose = require("mongoose");
const Slot = require("./models/Slot");

const initialSlots = [
  { slotId: "A1", level: 0, levelName: "Ground Floor", type: "REGULAR", baseRate: 40, isOccupied: false, vehicleNumber: null, entryTime: null },
  { slotId: "A2", level: 0, levelName: "Ground Floor", type: "REGULAR", baseRate: 40, isOccupied: false, vehicleNumber: null, entryTime: null },
  { slotId: "A3", level: 0, levelName: "Ground Floor", type: "EV", baseRate: 60, isOccupied: false, vehicleNumber: null, entryTime: null },
  { slotId: "A4", level: 0, levelName: "Ground Floor", type: "EV", baseRate: 60, isOccupied: false, vehicleNumber: null, entryTime: null },
  { slotId: "B1", level: -1, levelName: "Basement (Level -1)", type: "REGULAR", baseRate: 40, isOccupied: false, vehicleNumber: null, entryTime: null },
  { slotId: "B2", level: -1, levelName: "Basement (Level -1)", type: "REGULAR", baseRate: 40, isOccupied: false, vehicleNumber: null, entryTime: null },
  { slotId: "B3", level: -1, levelName: "Basement (Level -1)", type: "VIP", baseRate: 100, isOccupied: false, vehicleNumber: null, entryTime: null },
  { slotId: "B4", level: -1, levelName: "Basement (Level -1)", type: "REGULAR", baseRate: 40, isOccupied: false, vehicleNumber: null, entryTime: null },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas for slot seeding...");

    // Remove existing slots to avoid duplicates
    await Slot.deleteMany({});
    console.log("Existing parking slots cleared.");

    // Insert predefined parking bays
    await Slot.insertMany(initialSlots);
    console.log("All parking bays successfully seeded into MongoDB Atlas.");

    process.exit(0);
  } catch (error) {
    console.error("Slot seeding failed:", error);
    process.exit(1);
  }
};

seedDB();