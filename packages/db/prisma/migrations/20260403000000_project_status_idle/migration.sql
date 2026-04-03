-- AlterEnum: replace CREATED and DONE with IDLE
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('IDLE', 'PLANNING', 'PLANNED', 'CODING', 'FAILED');
ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING (
  CASE "status"
    WHEN 'CREATED' THEN 'IDLE'
    WHEN 'DONE'    THEN 'IDLE'
    ELSE "status"::text::"ProjectStatus_new"
  END
);
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "ProjectStatus_old";
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'IDLE';
COMMIT;
