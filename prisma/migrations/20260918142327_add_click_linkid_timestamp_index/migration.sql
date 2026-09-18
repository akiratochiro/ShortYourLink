-- DropIndex
DROP INDEX "Click_linkId_idx";

-- CreateIndex
CREATE INDEX "Click_linkId_timestamp_idx" ON "Click"("linkId", "timestamp");
