/**
 * Core story state shape and update helpers.
 */

const DEFAULT_CHECKPOINT_INTERVAL = 5;

export function createInitialState() {
  return {
    current_text: "",
    summary_history: [],
    branch_metadata: [],
    version: 1,
    hash: ""
  };
}

export function summarizeChapter(text, maxLength = 180) {
  if (!text) return "";
  const condensed = text.replace(/\s+/g, " ").trim();
  if (condensed.length <= maxLength) return condensed;
  return `${condensed.slice(0, maxLength - 3)}...`;
}

async function calculateHash(value) {
  const encoded = new TextEncoder().encode(JSON.stringify(value));

  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Node fallback for tests and local linting.
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(encoded).digest("hex");
}

export async function updateStoryState(
  state,
  {
    newChapterText,
    branchChoiceLabel,
    resolvedAt,
    votesSinceLastCheckpoint,
    checkpointInterval = DEFAULT_CHECKPOINT_INTERVAL
  }
) {
  const nextState = structuredClone(state ?? createInitialState());

  const safeResolvedAt = resolvedAt || new Date().toISOString();
  const safeVotes = Number.isFinite(votesSinceLastCheckpoint)
    ? votesSinceLastCheckpoint
    : 0;

  // Promote the existing chapter into the summary stack if it exists.
  if (nextState.current_text) {
    const summary = summarizeChapter(nextState.current_text);
    const checkpointed =
      checkpointInterval > 0 &&
      safeVotes > 0 &&
      safeVotes % checkpointInterval === 0;

    nextState.summary_history.unshift(
      checkpointed
        ? `Checkpoint (${safeResolvedAt}): ${summary}`
        : summary
    );
  }

  // Store metadata about the branch that was chosen.
  if (branchChoiceLabel) {
    nextState.branch_metadata.unshift({
      choice: branchChoiceLabel,
      resolved_at: safeResolvedAt,
      votes: safeVotes,
      checkpoint_interval: checkpointInterval
    });
  }

  nextState.current_text = newChapterText;
  nextState.version = (nextState.version || 0) + 1;

  nextState.hash = await calculateHash({
    current_text: nextState.current_text,
    summary_history: nextState.summary_history,
    branch_metadata: nextState.branch_metadata,
    version: nextState.version
  });

  return nextState;
}

export function buildCheckpointSnapshot(state, maxSummaries = 3) {
  if (!state) return "";
  const slices = state.summary_history.slice(0, maxSummaries);
  return slices.join(" • ");
}
