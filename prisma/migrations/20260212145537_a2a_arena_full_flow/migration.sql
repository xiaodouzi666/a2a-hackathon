-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "tokenExpiresAt" DATETIME;

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "voteFor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
INSERT INTO "new_Room" ("createdAt", "description", "finalPrice", "guestId", "hostId", "id", "itemName", "listPrice", "maxPrice", "minPrice", "status", "updatedAt") SELECT "createdAt", "description", "finalPrice", "guestId", "hostId", "id", "itemName", "listPrice", "maxPrice", "minPrice", "status", "updatedAt" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Vote_roomId_voterId_key" ON "Vote"("roomId", "voterId");
