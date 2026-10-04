# ParkFlow — Smart Bay Allocation & Dynamic Pricing Engine

An enterprise-grade smart parking management system featuring real-time bay allocation, dynamic surge pricing, multi-client live synchronization, and historical transaction auditing.

---

## System Overview

**ParkFlow** is designed to streamline commercial vehicle parking operations across high-density facilities such as shopping malls, business parks, transit hubs, and airports. The platform replaces traditional manual slip distribution with an automated operational workflow for barrier operators while delivering financial audit analytics for facility owners.

---

## Architecture & Technology Stack

- **Frontend:** Angular 18 (Standalone Components, Signals State Management, SCSS)
- **Backend:** Node.js, Express.js REST APIs
- **Database:** MongoDB Atlas (Cloud NoSQL) with Mongoose ODM
- **Data Synchronization:** Interval-based automated state polling (3.5s refresh cycle)

```
[ Gate 1: Check-in Terminal ] ───┐
                                 ├──► [ Angular Client ] ◄──► [ Express REST API ] ◄──► [ MongoDB Atlas ]
[ Gate 2: Checkout Terminal ] ───┘           ▲
                                             │ (Automated Sync)
[ Facility Owner Analytics ] ────────────────┘
```

---

## Core Capabilities

### 1. Guard Gate Terminal
- **Interactive Floorplan Layout:** Real-time visual monitoring across Ground Floor (Level 0) and Basement (Level -1).
- **Bay Categories:**
  - `REGULAR`: Dedicated bays for sedans, hatchbacks, and standard vehicles.
  - `EV`: Prime parking bays integrated with electric charging stations.
  - `VIP`: Reserved executive parking bays.
- **Interactive Click-to-Park:** Operators can select an available green bay directly from the visual map to auto-assign reservations.
- **Direct Checkout Selection:** Clicking any occupied red bay auto-fills vehicle details into the Gate 2 clearance terminal.

### 2. Dynamic Tariff & Surge Engine
- **Automated Occupancy Detection:** Continuously tracks total capacity versus active occupancy percentage.
- **Surge Pricing Tiers:**
  - `< 50% Occupancy`: Standard Tariff (1.0x Base Rate)
  - `50% – 74% Occupancy`: Surge Tariff (1.25x Multiplier)
  - `≥ 75% Occupancy`: Peak Tariff (1.5x Multiplier)
- **Rate Locking:** Dynamic rates calculate upon arrival and remain locked for the duration of the vehicle's stay to ensure pricing transparency.

### 3. Smart Exit Clearance & Receipt Generation
- **Duration Metering:** Calculates exact parking duration based on entry and exit timestamps.
- **Grace Period Waiver:** Stays of 15 minutes or less are automatically waived (₹0 billed total).
- **Clearance Receipt:** Generates an immediate digital voucher containing license plate data, duration, applied rate, and final bill amount.

### 4. Facility Owner Analytics & Audit Logs
- **Operational Mode Switching:** Instant navigation between the Gate Operator Terminal and Owner Audit views.
- **Financial Key Performance Indicators (KPIs):**
  - Lifetime Realized Revenue
  - Total Vehicle Checkouts
  - Average Realized Tariff Per Stay
- **Historical Activity Logging:** Every checkout archives into a permanent transaction log record tracking dates, parking bays, durations, and payment totals.

---

## Data Models

### 1. `Slot` (Active Bay State)
```typescript
{
  slotId: String,          // Unique Bay Identifier (e.g., "A1", "B2")
  level: Number,           // Numeric floor level (0, -1)
  levelName: String,       // Human-readable floor name
  type: String,            // "REGULAR" | "EV" | "VIP"
  baseRate: Number,        // Base hourly tariff
  isOccupied: Boolean,     // Occupancy state
  vehicleNumber: String,   // Currently parked license plate
  entryTime: Date          // Check-in timestamp
}
```

### 2. `ParkingLog` (Permanent Historical Transactions)
```typescript
{
  vehicleNo: String,       // Vehicle license plate
  slotId: String,          // Allocated bay
  floor: String,           // Floor location
  type: String,            // Vehicle category
  entryTime: Date,         // Entry timestamp
  exitTime: Date,          // Exit timestamp
  durationMinutes: Number, // Total duration in minutes
  billableHours: Number,   // Total billable hours
  ratePerHour: Number,     // Locked hourly tariff
  totalAmount: Number,     // Total collected revenue
  isGracePeriod: Boolean,  // Grace period qualification flag
  createdAt: Date          // Transaction record creation timestamp
}
```

---

## API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/slots` | Retrieve all bay allocations, occupancy states, and dynamic rates |
| `POST` | `/api/book-slot` | Check in a vehicle and assign a bay |
| `POST` | `/api/exit-slot` | Calculate charges, release bay, and archive audit log |
| `GET` | `/api/logs` | Fetch permanent chronological parking history records |

---

## Installation & Setup

### Prerequisites
- Node.js (version 18 or later)
- Angular CLI
- MongoDB Atlas database cluster connection URI

### 1. Repository Setup
```bash
git clone [https://github.com/YOUR_USERNAME/smart-parking-app.git](https://github.com/YOUR_USERNAME/smart-parking-app.git)
cd smart-parking-app
```

### 2. Backend Configuration
```bash
cd backend
npm install
```

Create a `.env` configuration file in the `backend/` directory:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/smart_parking?retryWrites=true&w=majority
```

Seed initial bays into MongoDB Atlas:
```bash
node seedSlots.js
```

Start the backend development server:
```bash
npm run dev
```

### 3. Frontend Configuration
Open a separate terminal window:
```bash
cd frontend
npm install
npm start
```

Access the user interface locally at:
`http://localhost:4200`