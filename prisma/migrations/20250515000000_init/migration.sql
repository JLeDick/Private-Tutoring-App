-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TUTOR');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('PLACEMENT', 'ASSIGNMENT', 'QUIZ', 'UNIT_TEST');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "startingGedPercent" INTEGER NOT NULL DEFAULT 0,
    "currentGedPercent" INTEGER NOT NULL DEFAULT 0,
    "placementCompletedAt" TIMESTAMP(3),
    "recommendedCourseId" TEXT,
    "recommendedCoreIdeaId" TEXT,
    "lastVisitedCourseId" TEXT,
    "lastVisitedCoreIdeaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreIdea" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CoreIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "progressWeight" INTEGER NOT NULL DEFAULT 1,
    "courseId" TEXT,
    "coreIdeaId" TEXT,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "choicesJson" TEXT,
    "correctIndex" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "earnedPoints" INTEGER,
    "maxPoints" INTEGER,
    "fullyGraded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "textValue" TEXT,
    "selectedIndex" INTEGER,
    "pointsAwarded" INTEGER,
    "tutorComment" TEXT,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT,
    "eventType" TEXT NOT NULL,
    "clientTimestamp" TIMESTAMP(3),
    "pastedLength" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CoreIdea_courseId_slug_key" ON "CoreIdea"("courseId", "slug");

-- CreateIndex
CREATE INDEX "Assessment_courseId_idx" ON "Assessment"("courseId");

-- CreateIndex
CREATE INDEX "Assessment_coreIdeaId_idx" ON "Assessment"("coreIdeaId");

-- CreateIndex
CREATE INDEX "Assessment_type_idx" ON "Assessment"("type");

-- CreateIndex
CREATE INDEX "Question_assessmentId_idx" ON "Question"("assessmentId");

-- CreateIndex
CREATE INDEX "Attempt_userId_assessmentId_idx" ON "Attempt"("userId", "assessmentId");

-- CreateIndex
CREATE INDEX "Attempt_userId_submittedAt_idx" ON "Attempt"("userId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_attemptId_questionId_key" ON "Answer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "IntegrityEvent_attemptId_idx" ON "IntegrityEvent"("attemptId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_recommendedCourseId_fkey" FOREIGN KEY ("recommendedCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_recommendedCoreIdeaId_fkey" FOREIGN KEY ("recommendedCoreIdeaId") REFERENCES "CoreIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastVisitedCourseId_fkey" FOREIGN KEY ("lastVisitedCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastVisitedCoreIdeaId_fkey" FOREIGN KEY ("lastVisitedCoreIdeaId") REFERENCES "CoreIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreIdea" ADD CONSTRAINT "CoreIdea_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_coreIdeaId_fkey" FOREIGN KEY ("coreIdeaId") REFERENCES "CoreIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityEvent" ADD CONSTRAINT "IntegrityEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
