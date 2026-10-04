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
    console.log("Connected to MongoDB Atlas for seeding...");

    // Pehle existing slots clean karein taaki duplicate na banein
    await Slot.deleteMany({});
    console.log("Cleared existing slots.");

    // Initial slots insert karein
    await Slot.insertMany(initialSlots);
    console.log("All slots seeded successfully into MongoDB Atlas!");

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDB();