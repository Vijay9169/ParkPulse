require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Slot = require("./models/Slot");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// Dynamic surge multiplier calculate karne ka function
const getDynamicMultiplier = (occupancyPercent) => {
  if (occupancyPercent >= 75) return 1.5;
  if (occupancyPercent >= 50) return 1.25;
  return 1.0;
};

// 1. GET /api/slots - Fetch all slots mapped exactly for Angular
app.get("/api/slots", async (req, res) => {
  try {
    const rawSlots = await Slot.find().sort({ level: 1, slotId: 1 }).lean();

    const occupiedCount = rawSlots.filter((s) => s.isOccupied).length;
    const totalCount = rawSlots.length;
    const occupancyPercent = totalCount ? Math.round((occupiedCount / totalCount) * 100) : 0;
    const multiplier = getDynamicMultiplier(occupancyPercent);

    // Frontend `ParkingSlot` interface ke sath exact mapping
    const data = rawSlots.map((s) => {
      const base = s.baseRate || 40;
      const dynamicRate = Math.round(base * multiplier);
      const isOccupied = !!s.isOccupied;

      return {
        id: s.slotId,
        type: s.type || "REGULAR",
        floor: s.level === 0 ? "Ground" : "B1",
        status: isOccupied ? "OCCUPIED" : "AVAILABLE",
        baseRatePerHour: base,
        currentDynamicRate: dynamicRate,
        currentVehicle: s.vehicleNumber || undefined,
        lockedRatePerHour: isOccupied ? dynamicRate : null,
      };
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Fetch slots error:", error);
    res.status(500).json({ success: false, message: "Slots fetch error" });
  }
});

// 2. POST /api/book-slot - Gate 1 Entry Check-in
app.post("/api/book-slot", async (req, res) => {
  try {
    const { vehicleNo, type, preferredSlotId } = req.body;

    if (!vehicleNo) {
      return res.status(400).json({ success: false, message: "Vehicle license plate zaroori hai." });
    }

    let targetSlot = null;

    if (preferredSlotId) {
      targetSlot = await Slot.findOne({ slotId: preferredSlotId, isOccupied: false });
    }

    if (!targetSlot) {
      const searchType = (type || "REGULAR").toUpperCase();
      targetSlot = await Slot.findOne({ type: searchType, isOccupied: false });

      if (!targetSlot && searchType !== "REGULAR") {
        targetSlot = await Slot.findOne({ type: "REGULAR", isOccupied: false });
      }
    }

    if (!targetSlot) {
      return res.status(404).json({ success: false, message: `Koi ${type || "REGULAR"} bay vacant nahi hai!` });
    }

    targetSlot.isOccupied = true;
    targetSlot.vehicleNumber = vehicleNo.trim().toUpperCase();
    targetSlot.entryTime = new Date();
    await targetSlot.save();

    res.json({
      success: true,
      message: `Bay ${targetSlot.slotId} successfully allocate ho gayi.`,
      session: {
        id: targetSlot.slotId,
        vehicleNo: targetSlot.vehicleNumber,
        slotId: targetSlot.slotId,
      },
    });
  } catch (error) {
    console.error("Book error:", error);
    res.status(500).json({ success: false, message: "Booking process failed." });
  }
});

// 3. POST /api/exit-slot - Gate 2 Checkout & Receipt Generation
app.post("/api/exit-slot", async (req, res) => {
  try {
    const { vehicleNo } = req.body;

    if (!vehicleNo) {
      return res.status(400).json({ success: false, message: "Vehicle plate number enter kijiye." });
    }

    const cleanVehicleNo = vehicleNo.trim().toUpperCase();
    const slot = await Slot.findOne({ vehicleNumber: cleanVehicleNo, isOccupied: true });

    if (!slot) {
      return res.status(404).json({ success: false, message: `Gaadi ${cleanVehicleNo} parking me nahi mili!` });
    }

    const exitTime = new Date();
    const entryTime = slot.entryTime ? new Date(slot.entryTime) : new Date(Date.now() - 25 * 60 * 1000);
    const diffMs = Math.max(0, exitTime - entryTime);
    const durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

    // 15 mins se kam free grace period
    const isGracePeriod = durationMinutes <= 15;
    const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));
    const lockedEntryRate = slot.baseRate || 40;
    const totalAmount = isGracePeriod ? 0 : billableHours * lockedEntryRate;

    // Slot free karein
    slot.isOccupied = false;
    slot.vehicleNumber = null;
    slot.entryTime = null;
    await slot.save();

    res.json({
      success: true,
      receipt: {
        vehicleNo: cleanVehicleNo,
        slotId: slot.slotId,
        entryTime: entryTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        exitTime: exitTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMinutes,
        billableHours,
        lockedEntryRate,
        isGracePeriod,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Exit error:", error);
    res.status(500).json({ success: false, message: "Checkout failed." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Smart Parking Backend running on http://localhost:${PORT}`);
});