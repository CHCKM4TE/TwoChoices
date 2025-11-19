# TwoChoices Worker

A Cloudflare Worker for storing lightweight story progression data. It keeps only the current chapter text plus periodic checkpoint summaries of prior branches, and exposes endpoints to update the state after votes resolve.

## Story state shape
Each `story_state` object persisted in KV or D1 contains:

- `current_text`: full text of the active chapter.
- `summary_history`: array of short bullet summaries for previous chapters/checkpoints (most recent first).
- `branch_metadata`: brief metadata for each resolved branch (choice label, timestamp, votes, checkpoint interval).
- `version` and `hash`: incrementing version and SHA-256 integrity hash of the serializable fields.

## API
- `GET /api/story/:id` – fetch the current story state (creates an empty state if none exists).
- `POST /api/story/:id/update` – update the story after a vote resolution with JSON body:
  ```json
  {
    "newChapterText": "Full text for the winning branch",
    "branchChoiceLabel": "Choice A",
    "resolvedAt": "2024-04-09T12:30:00Z", // optional
    "votesSinceLastCheckpoint": 10,
    "checkpointInterval": 5
  }
  ```
  The worker promotes the previous `current_text` into `summary_history`, checkpointing every `checkpointInterval` votes, and writes a new integrity hash.
- `GET /api/story/:id/recap` – returns a readable "previously on" paragraph for new sessions.

## Persistence
Configure one of the following bindings in `wrangler.toml`:

```toml
# Prefer KV for simplicity
kv_namespaces = [
  { binding = "STORY_STATE_KV", id = "<kv-id>" }
]

# Or D1
[[d1_databases]]
binding = "STORY_STATE_DB"
database_name = "twochoices"
tables = ["story_state"]
```

If you use D1, create the table:

```sql
CREATE TABLE IF NOT EXISTS story_state (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL
);
```

## Utility recap
The `buildPreviouslyOnParagraph` helper (exported from `src/previouslyOn.js`) assembles a short recap paragraph from summaries, checkpoints, and the latest chapter to help new sessions catch up.

## Development

- Lint syntax: `npm run lint`
- The project uses native ES modules and no third-party dependencies.
