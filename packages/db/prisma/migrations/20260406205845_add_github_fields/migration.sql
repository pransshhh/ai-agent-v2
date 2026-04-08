-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "githubBaseBranch" TEXT,
ADD COLUMN     "githubPat" TEXT,
ADD COLUMN     "githubPrUrl" TEXT,
ADD COLUMN     "githubRepoUrl" TEXT;
