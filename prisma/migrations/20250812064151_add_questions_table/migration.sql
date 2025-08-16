-- CreateTable
CREATE TABLE "sources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question_id" INTEGER NOT NULL,
    "answer_id" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "hunter_address" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "questions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question_id" INTEGER NOT NULL,
    "rules" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "sources_question_id_answer_id_idx" ON "sources"("question_id", "answer_id");

-- CreateIndex
CREATE INDEX "sources_hunter_address_idx" ON "sources"("hunter_address");

-- CreateIndex
CREATE UNIQUE INDEX "questions_question_id_key" ON "questions"("question_id");

-- CreateIndex
CREATE INDEX "questions_question_id_idx" ON "questions"("question_id");
