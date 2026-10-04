require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Slot = require("./models/Slot");
const ParkingLog = require("./models/ParkingLog");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Database connection
connectDB();

// Helper to determine dynamic tariff multiplier
const getDynamicMultiplier = (occupancyPercent) => {
  if (occupancyPercent >= 75) return 1.5;
  if (occupancyPercent >= 50) return 1.25;
  return 1.0;
};

// 1. GET /api/slots - Fetch all parking bays formatted for Angular client
app.get("/api/slots", async (req, res) => {
  try {
    const rawSlots = await Slot.find().sort({ level: 1, slotId: 1 }).lean();

    const occupiedCount = rawSlots.filter((s) => s.isOccupied).length;
    const totalCount = rawSlots.length;
    const occupancyPercent = totalCount ? Math.round((occupiedCount / totalCount) * 100) : 0;
    const multiplier = getDynamicMultiplier(occupancyPercent);

    const data = rawSlots.map((s) => {
      const base = s.baseRate || 40;
      const dynamicRate = Math.round(base * multiplier);
      const isOccupied = Boolean(s.isOccupied);

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
    res.status(500).json({ success: false, message: "Internal server error while fetching bays." });
  }
});

// 2. POST /api/book-slot - Gate 1 Entry Check-in & Bay Allocation
app.post("/api/book-slot", async (req, res) => {
  try {
    const { vehicleNo, type, preferredSlotId } = req.body;

    if (!vehicleNo) {
      return res.status(400).json({ success: false, message: "Vehicle license plate is required." });
    }

    let targetSlot = null;

    // Check if the user selected a preferred slot
    if (preferredSlotId) {
      targetSlot = await Slot.findOne({ slotId: preferredSlotId, isOccupied: false });
    }

    // Auto-assignment fallback logic
    if (!targetSlot) {
      const searchType = (type || "REGULAR").toUpperCase();
      targetSlot = await Slot.findOne({ type: searchType, isOccupied: false });

      if (!targetSlot && searchType !== "REGULAR") {
        targetSlot = await Slot.findOne({ type: "REGULAR", isOccupied: false });
      }
    }

    if (!targetSlot) {
      return res.status(404).json({ success: false, message: `No vacant bays available for category: ${type || "REGULAR"}` });
    }

    targetSlot.isOccupied = true;
    targetSlot.vehicleNumber = vehicleNo.trim().toUpperCase();
    targetSlot.entryTime = new Date();
    await targetSlot.save();

    res.json({
      success: true,
      message: `Bay ${targetSlot.slotId} successfully allocated.`,
      session: {
        id: targetSlot.slotId,
        vehicleNo: targetSlot.vehicleNumber,
        slotId: targetSlot.slotId,
      },
    });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ success: false, message: "Failed to allocate parking bay." });
  }
});

// 3. POST /api/exit-slot - Gate 2 Checkout, Fee Computation & Audit Logging
app.post("/api/exit-slot", async (req, res) => {
  try {
    const { vehicleNo } = req.body;

    if (!vehicleNo) {
      return res.status(400).json({ success: false, message: "Vehicle license plate is required." });
    }

    const cleanVehicleNo = vehicleNo.trim().toUpperCase();
    const slot = await Slot.findOne({ vehicleNumber: cleanVehicleNo, isOccupied: true });

    if (!slot) {
      return res.status(404).json({ success: false, message: `Active session not found for vehicle: ${cleanVehicleNo}` });
    }

    const exitTime = new Date();
    const entryTime = slot.entryTime ? new Date(slot.entryTime) : new Date(Date.now() - 25 * 60 * 1000);
    const diffMs = Math.max(0, exitTime - entryTime);
    const durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

    // Free grace period if stay is 15 minutes or less
    const isGracePeriod = durationMinutes <= 15;
    const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));
    const lockedEntryRate = slot.baseRate || 40;
    const totalAmount = isGracePeriod ? 0 : billableHours * lockedEntryRate;
    const floor = slot.level === 0 ? "Ground" : "B1";

    // Persist permanent audit transaction
    await ParkingLog.create({
      vehicleNo: cleanVehicleNo,
      slotId: slot.slotId,
      floor,
      type: slot.type,
      entryTime,
      exitTime,
      durationMinutes,
      billableHours,
      ratePerHour: lockedEntryRate,
      totalAmount,
      isGracePeriod,
    });

    // Reset bay status for next arrival
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
    console.error("Exit processing error:", error);
    res.status(500).json({ success: false, message: "Failed to process parking clearance." });
  }
});

// 4. GET /api/logs - Fetch permanent historical parking records
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await ParkingLog.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      totalRecords: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Fetch logs error:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching audit logs." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Smart Parking Backend running on http://localhost:${PORT}`);
});