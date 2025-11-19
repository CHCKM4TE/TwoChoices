/**
 * Helpers for persisting story state to Cloudflare KV or D1.
 * The worker will prefer KV when configured, otherwise D1.
 */

const DB_TABLE = "story_state";

export async function loadState(env, storyId) {
  if (env.STORY_STATE_KV) {
    const raw = await env.STORY_STATE_KV.get(storyId);
    return raw ? JSON.parse(raw) : null;
  }

  if (env.STORY_STATE_DB) {
    const { results } = await env.STORY_STATE_DB.prepare(
      `SELECT state FROM ${DB_TABLE} WHERE id = ?1`
    )
      .bind(storyId)
      .all();
    if (!results || results.length === 0) return null;
    const row = results[0];
    return row?.state ? JSON.parse(row.state) : null;
  }

  throw new Error("No storage binding configured. Add STORY_STATE_KV or STORY_STATE_DB.");
}

export async function saveState(env, storyId, state) {
  const payload = JSON.stringify(state);
  if (env.STORY_STATE_KV) {
    await env.STORY_STATE_KV.put(storyId, payload);
    return;
  }

  if (env.STORY_STATE_DB) {
    await env.STORY_STATE_DB.prepare(
      `INSERT OR REPLACE INTO ${DB_TABLE} (id, state) VALUES (?1, ?2)`
    )
      .bind(storyId, payload)
      .run();
    return;
  }

  throw new Error("No storage binding configured. Add STORY_STATE_KV or STORY_STATE_DB.");
}
