# Campus Canteen Queue-Reduction & Dual-Printer Dispatch System

A hybrid cloud-based web application engineered for college canteens. It reduces long queues and crowding at the billing counter while **keeping the existing paper-based food preparation workflow completely unchanged**.

---

## 💡 The Core Problem & Solution

### The Current Canteen Bottleneck
1. **Billing Counter Crowd**: Students stand in a long queue just to tell their food items to the cashier.
2. **Repeated Order Entry**: The cashier manually types every single item into the POS to print a receipt.
3. **Double Handling**: The student carries the paper receipt to the food server, who reads the order and prepares the food.
4. **Printer Bottleneck**: When all orders are routed to a single thermal printer, paper jams or slow print speeds stall the entire kitchen pipeline.

### The Proposed System Architecture
- **Enter the Order Once**: Digital student orders enter the system directly via mobile web pre-ordering—**no cashier manual re-entry**.
- **Coexistence with Counter Orders**: Cashiers retain a fast POS terminal for students paying with cash at the counter. Both digital and manual orders share the exact same database and token numbering.
- **Dual-Printer Load Distribution**: Two dedicated thermal printers (Printer 1 at Station A, Printer 2 at Station B) receive orders in strict **alternating Round-Robin sequence** (`Order 1 -> Printer 1`, `Order 2 -> Printer 2`, `Order 3 -> Printer 1`, `Order 4 -> Printer 2`...).
- **Strict Idempotency (Single-Print Guarantee)**: Each order is printed **exactly once**. Duplicate bill printing is rejected at the spooler level, ensuring kitchen servers never prepare duplicate meals.
- **Unchanged Server Workflow**: Food servers do **not** need smartphones, tablets, or computer monitors—they continue working comfortably with physical paper order slips.

---

## 🚀 Quick Start

### 1. Requirements
- Node.js (v20+ or v22+)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 2. Run with Docker

Create `server/.env` from `server/.env.example` and add the Firebase Admin
credentials. The private key must contain `\n` escape sequences:

```powershell
Copy-Item server/.env.example server/.env
npm --prefix client ci
npm --prefix client run build
docker compose up --build
```

The application is available at `http://localhost:5050`. The production
container refuses to start without Firebase credentials, and the menu is
published to Firestore during startup. Never commit `server/.env` or
`serviceAccountKey.json`.

### 3. Run the Unified System
From the project root:
```bash
# Start the full-stack server (serves both API and pre-built React UI)
npm start
```
Open **`http://localhost:5000`** in your browser.

### 4. Run Automated Tests
```bash
npm test
```
This runs `server/tests/test-load-balancing.js` which verifies:
- Database schema and seed menu items.
- Strict 1:1 alternating Round-Robin assignment between Printer 1 and Printer 2.
- Single-print idempotency rejection guards.
- Authorized supervisor reprint watermarking.

---

## 🖥️ System Modules & Views

The application includes 5 purpose-built interfaces accessible via the top navigation bar:

1. 📱 **Student Mobile Pre-Order Portal**:
   - Allows students to browse items, add to cart, and place orders directly from their smartphone.
   - Generates a unique **Digital Token Ticket** (e.g. `TOKEN #105`) with live kitchen progress tracking.
2. 🖥️ **Cashier Walk-in POS Terminal**:
   - Fast 1-click billing interface for counter staff with cash tendering and change calculation.
   - Automatically dispatches paper slip to the next alternating kitchen printer.
3. 🖨️ **Dual-Printer Live Spooler Console**:
   - Visual split-screen monitor representing the physical kitchen reality.
   - Displays real-time thermal receipt rollouts (58mm/80mm format) for **Printer 1 (Station A)** and **Printer 2 (Station B)**.
   - Includes paper status toggling (simulate Paper Out to demonstrate auto-failover) and supervisor reprint controls.
4. 📺 **Public Canteen TV Status Board**:
   - Wall-mounted screen showing **PREPARING IN KITCHEN** and **READY FOR PICKUP** token numbers.
5. 📊 **Operations & Analytics Dashboard**:
   - Real-time metrics on counter queue reduction %, intake channels (Digital vs Counter), and 1:1 printer load balance ratio.
   - Live kitchen stock toggle (mark items sold out in real-time).

---

## 📐 Two-Printer Distribution Algorithm

```
                  [ New Order Created ]
                            │
               Is Printer 1 & 2 Online?
                    ├── YES ──> Next Index = (LastAssignedIndex + 1) % 2
                    │               ├── Index 0 ──> Assign PRINTER 1 (Station A)
                    │               └── Index 1 ──> Assign PRINTER 2 (Station B)
                    └── NO  ──> Failover: Route to available online printer
                            │
              [ Spooler Idempotency Check ]
              Has order ID printed before?
                    ├── YES & Not Reprint ──> REJECT (Prevent duplicate food prep)
                    └── NO  ───────────────> PRINT SLIP ONCE & TIMESTAMP
```

---

## 📁 Project Directory Structure

```
canteen-queue-system/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Built-in SQLite schema & initial seed
│   │   ├── controllers/
│   │   │   ├── orderController.js   # Order creation, token logic & reprint
│   │   │   ├── menuController.js    # Canteen menu & stock availability
│   │   │   └── printerController.js # Spooler status & printer simulation
│   │   ├── services/
│   │   │   └── printerSpooler.js    # Strict alternating Round-Robin spooler
│   │   ├── utils/
│   │   │   └── receiptFormatter.js  # 58mm/80mm thermal slip text generator
│   │   ├── routes/
│   │   │   └── api.js               # REST endpoints
│   │   └── server.js                # Express app + SSE live event streaming
│   └── tests/
│       └── test-load-balancing.js   # 100% passing automated test suite
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── student/             # Mobile queue-bypass ordering
│   │   │   ├── cashier/             # High-speed POS counter billing
│   │   │   ├── printer/             # Dual-printer live receipt visualizer
│   │   │   ├── display/             # Canteen wall TV token board
│   │   │   ├── analytics/           # Operational stats & stock toggles
│   │   │   └── Navigation.jsx       # Tab switcher & SSE live indicator
│   │   ├── services/
│   │   │   └── api.js               # REST & SSE stream client
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── dist/                        # Production optimized build bundle
└── package.json
```
