const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { INITIAL_SLOTS } = require("./seedSlots");

const app = express();
app.use(cors());
app.use(express.json());

let slots = [...INITIAL_SLOTS];
let activeSessions = {}; // Key: vehicleNo

// Helper: Dynamic Surge Pricing Algorithm for CURRENT market
function calculateCurrentRate(slot) {
    const occupiedCount = slots.filter((s) => s.status === "OCCUPIED").length;
    const occupancyPercentage = (occupiedCount / slots.length) * 100;

    let surgeMultiplier = 1.0;
    if (occupancyPercentage >= 75) {
        surgeMultiplier = 1.5; // 50% surge on peak
    } else if (occupancyPercentage >= 50) {
        surgeMultiplier = 1.25;
    }

    return Math.round(slot.baseRatePerHour * surgeMultiplier);
}

// 1. GET ALL SLOTS
app.get("/api/slots", (req, res) => {
    const slotsWithLivePrice = slots.map((slot) => {
        // Agar slot occupied hai, to us vehicle ka locked rate fetch karein
        const session = Object.values(activeSessions).find(s => s.slotId === slot.id);
        return {
            ...slot,
            currentDynamicRate: calculateCurrentRate(slot),
            lockedRatePerHour: session ? session.ratePerHour : null // Entry time locked rate
        };
    });
    res.json({ success: true, data: slotsWithLivePrice });
});

// 2. POST /api/book-slot (Entry Gate - Smart Cheapest-First Allocation)
// app.post("/api/book-slot", (req, res) => {
//     const { vehicleNo, type } = req.body;

//     if (!vehicleNo) {
//         return res.status(400).json({ success: false, message: "Vehicle number required" });
//     }

//     if (activeSessions[vehicleNo]) {
//         return res.status(400).json({ success: false, message: "Vehicle already inside parking!" });
//     }

//     // 1. Filter available slots matching type
//     const availableSlots = slots.filter(
//         (s) => s.status === "AVAILABLE" && (!type || s.type === type)
//     );

//     if (availableSlots.length === 0) {
//         return res.status(404).json({ success: false, message: "No slot available for type: " + (type || 'ANY') });
//     }

//     // 2. Sort by Cheapest Price First (Best deal for customer)
//     availableSlots.sort((a, b) => a.baseRatePerHour - b.baseRatePerHour);
//     const targetSlot = availableSlots[0];

//     // 3. Freeze rate at this exact moment
//     const lockedRate = calculateCurrentRate(targetSlot);

//     // 4. Mark Occupied
//     targetSlot.status = "OCCUPIED";
//     targetSlot.currentVehicle = vehicleNo;

//     const session = {
//         sessionId: "SESS_" + Date.now(),
//         vehicleNo,
//         slotId: targetSlot.id,
//         entryTime: Date.now(),
//         ratePerHour: lockedRate, // <--- PRICE LOCKED HERE! Never changes for this car
//     };

//     activeSessions[vehicleNo] = session;

//     return res.json({
//         success: true,
//         message: `Slot ${targetSlot.id} allocated at locked rate of ₹${lockedRate}/hr!`,
//         session,
//     });
// });

// 2. POST /api/book-slot (Supports Auto-assign OR Specific Bay Choice)
app.post("/api/book-slot", (req, res) => {
    const { vehicleNo, type, preferredSlotId } = req.body;

    if (!vehicleNo) {
        return res.status(400).json({ success: false, message: "Vehicle number required" });
    }

    if (activeSessions[vehicleNo]) {
        return res.status(400).json({ success: false, message: "Vehicle already inside parking!" });
    }

    let targetSlot;

    if (preferredSlotId) {
        // Agar user ne specific bay choose kiya hai
        targetSlot = slots.find(
            (s) => s.id === preferredSlotId && s.status === "AVAILABLE"
        );
        if (!targetSlot) {
            return res.status(400).json({ success: false, message: `Slot ${preferredSlotId} is already occupied or invalid!` });
        }
    } else {
        // Agar user ne koi specific bay nahi chuna, to Auto-Assign cheapest available
        const availableSlots = slots.filter(
            (s) => s.status === "AVAILABLE" && (!type || s.type === type)
        );

        if (availableSlots.length === 0) {
            return res.status(404).json({ success: false, message: "No available slots for type: " + (type || 'ANY') });
        }

        availableSlots.sort((a, b) => a.baseRatePerHour - b.baseRatePerHour);
        targetSlot = availableSlots[0];
    }

    // Freeze rate at entry
    const lockedRate = calculateCurrentRate(targetSlot);

    targetSlot.status = "OCCUPIED";
    targetSlot.currentVehicle = vehicleNo;

    const session = {
        sessionId: "SESS_" + Date.now(),
        vehicleNo,
        slotId: targetSlot.id,
        entryTime: Date.now(),
        ratePerHour: lockedRate,
    };

    activeSessions[vehicleNo] = session;

    return res.json({
        success: true,
        message: `Slot ${targetSlot.id} allocated successfully at locked rate ₹${lockedRate}/hr!`,
        session,
    });
});

// 3. POST /api/exit-slot (Exit Gate - Bill calculated on LOCKED rate)
// app.post("/api/exit-slot", (req, res) => {
//   const { vehicleNo } = req.body;

//   const session = activeSessions[vehicleNo];
//   if (!session) {
//     return res.status(404).json({ success: false, message: "No active session found for vehicle" });
//   }

//   const exitTime = Date.now();
//   // Duration calculation (demo: 1 min = 1 hr)
//   const durationInMinutes = Math.max(1, Math.round((exitTime - session.entryTime) / 60000));
//   const billableHours = Math.ceil(durationInMinutes / 1);

//   // IMPORTANT: Multiply by session.ratePerHour (Entry time rate), NOT the surge rate!
//   const totalAmount = billableHours * session.ratePerHour;

//   const slot = slots.find((s) => s.id === session.slotId);
//   if (slot) {
//     slot.status = "AVAILABLE";
//     delete slot.currentVehicle;
//   }

//   delete activeSessions[vehicleNo];

//   return res.json({
//     success: true,
//     receipt: {
//       vehicleNo,
//       slotId: session.slotId,
//       entryTime: new Date(session.entryTime).toLocaleTimeString(),
//       exitTime: new Date(exitTime).toLocaleTimeString(),
//       totalHours: billableHours,
//       lockedEntryRate: session.ratePerHour,
//       totalAmount,
//     },
//   });
// });

// 3. POST /api/exit-slot (Real-World Accurate Billing)
app.post("/api/exit-slot", (req, res) => {
    const { vehicleNo } = req.body;

    const session = activeSessions[vehicleNo];
    if (!session) {
        return res.status(404).json({ success: false, message: "No active session found for vehicle" });
    }

    const exitTime = Date.now();

    // Real duration in milliseconds & minutes
    const durationMs = exitTime - session.entryTime;
    const durationInMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    let billableHours = 0;
    let totalAmount = 0;

    // RULE 1: Pehle 15 minute Grace Period (FREE)
    if (durationInMinutes <= 15) {
        billableHours = 0;
        totalAmount = 0;
    } else {
        // RULE 2: 15 min ke baad actual hourly slabs (e.g. 70 min = 2 hours)
        billableHours = Math.ceil(durationInMinutes / 60);
        totalAmount = billableHours * session.ratePerHour;
    }

    // Slot ko free karein
    const slot = slots.find((s) => s.id === session.slotId);
    if (slot) {
        slot.status = "AVAILABLE";
        delete slot.currentVehicle;
    }

    delete activeSessions[vehicleNo];

    return res.json({
        success: true,
        receipt: {
            vehicleNo,
            slotId: session.slotId,
            entryTime: new Date(session.entryTime).toLocaleTimeString(),
            exitTime: new Date(exitTime).toLocaleTimeString(),
            durationMinutes: durationInMinutes,
            billableHours,
            lockedEntryRate: session.ratePerHour,
            totalAmount,
            isGracePeriod: durationInMinutes <= 15
        },
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Smart Parking Backend running on http://localhost:${PORT}`);
});