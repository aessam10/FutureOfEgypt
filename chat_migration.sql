START TRANSACTION;
ALTER TABLE "ChatParticipants" ADD "ArchivedAtUtc" timestamp with time zone;

ALTER TABLE "ChatParticipants" ADD "IsArchived" boolean NOT NULL DEFAULT FALSE;

ALTER TABLE "ChatParticipants" ADD "MutedUntilUtc" timestamp with time zone;

CREATE INDEX "IX_ChatParticipants_UserId_IsArchived" ON "ChatParticipants" ("UserId", "IsArchived");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260701164010_AddChatMuteArchiveToParticipants', '10.0.9');

COMMIT;

