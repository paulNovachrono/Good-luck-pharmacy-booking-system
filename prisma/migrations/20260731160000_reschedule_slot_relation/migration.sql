-- AlterTable
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_requestedSlotId_fkey" FOREIGN KEY ("requestedSlotId") REFERENCES "TimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "RescheduleRequest_requestedSlotId_key" ON "RescheduleRequest"("requestedSlotId");
