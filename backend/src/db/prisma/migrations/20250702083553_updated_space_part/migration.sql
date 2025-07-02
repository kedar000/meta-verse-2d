/*
  Warnings:

  - You are about to drop the `private_space_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `private_spaces` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "private_space_members" DROP CONSTRAINT "private_space_members_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "private_space_members" DROP CONSTRAINT "private_space_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "private_spaces" DROP CONSTRAINT "private_spaces_createdById_fkey";

-- DropForeignKey
ALTER TABLE "user_positions" DROP CONSTRAINT "user_positions_spaceId_fkey";

-- DropTable
DROP TABLE "private_space_members";

-- DropTable
DROP TABLE "private_spaces";

-- CreateTable
CREATE TABLE "spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "role" "SpaceMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_members_userId_spaceId_key" ON "space_members"("userId", "spaceId");

-- AddForeignKey
ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
