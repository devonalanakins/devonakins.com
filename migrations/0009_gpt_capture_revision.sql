-- A monotonic editor revision also covers sharing, legacy writes and deletion.
-- Existing readings and individual publication consent remain unchanged.
CREATE TABLE gpt_capture_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  revision INTEGER NOT NULL CONSTRAINT gpt_capture_revision CHECK(revision>=0)
);
INSERT INTO gpt_capture_state(id,revision) VALUES(1,0);
CREATE TRIGGER gpt_capture_insert AFTER INSERT ON gpt_owner_metrics BEGIN
  UPDATE gpt_capture_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER gpt_capture_update AFTER UPDATE ON gpt_owner_metrics BEGIN
  UPDATE gpt_capture_state SET revision=revision+1 WHERE id=1;
END;
CREATE TRIGGER gpt_capture_delete AFTER DELETE ON gpt_owner_metrics BEGIN
  UPDATE gpt_capture_state SET revision=revision+1 WHERE id=1;
END;
