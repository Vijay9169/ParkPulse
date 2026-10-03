// Sample parking slots metadata
const INITIAL_SLOTS = [
    { id: "A1", type: "REGULAR", floor: "Ground", status: "AVAILABLE", baseRatePerHour: 50 },
    { id: "A2", type: "REGULAR", floor: "Ground", status: "AVAILABLE", baseRatePerHour: 50 },
    { id: "A3", type: "EV",      floor: "Ground", status: "AVAILABLE", baseRatePerHour: 80 },
    { id: "A4", type: "EV",      floor: "Ground", status: "AVAILABLE", baseRatePerHour: 80 },
    { id: "B1", type: "REGULAR", floor: "B1",     status: "AVAILABLE", baseRatePerHour: 40 },
    { id: "B2", type: "REGULAR", floor: "B1",     status: "AVAILABLE", baseRatePerHour: 40 },
    { id: "B3", type: "VIP",     floor: "B1",     status: "AVAILABLE", baseRatePerHour: 100 },
    { id: "B4", type: "REGULAR", floor: "B1",     status: "AVAILABLE", baseRatePerHour: 40 }
  ];
  
  module.exports = { INITIAL_SLOTS };