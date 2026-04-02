-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('CREATED', 'PLANNING', 'PLANNED', 'CODING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "jiraProjectKey" TEXT,
    "jiraBoardId" INTEGER,
    "jiraSprintId" INTEGER,
    "status" "ProjectStatus" NOT NULL DEFAULT 'CREATED',
    "currentRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
