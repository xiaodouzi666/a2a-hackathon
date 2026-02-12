/*
  Warnings:

  - You are about to drop the column `buyerPreference` on the `Room` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostId" TEXT NOT NULL,
    "guestId" TEXT,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "listPrice" REAL NOT NULL,
    "minPrice" REAL NOT NULL,
    "maxPrice" REAL,
    "finalPrice" REAL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "isProcessing" BOOLEAN NOT NULL DEFAULT false,
    "sellerSessionId" TEXT,
    "buyerSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Room_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Room" ("buyerSessionId", "createdAt", "description", "finalPrice", "guestId", "hostId", "id", "isProcessing", "itemName", "listPrice", "maxPrice", "minPrice", "sellerSessionId", "status", "updatedAt") SELECT "buyerSessionId", "createdAt", "description", "finalPrice", "guestId", "hostId", "id", "isProcessing", "itemName", "listPrice", "maxPrice", "minPrice", "sellerSessionId", "status", "updatedAt" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
