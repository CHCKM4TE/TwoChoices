import { buildPreviouslyOnParagraph } from "./previouslyOn.js";
import { loadState, saveState } from "./persistence.js";
import { buildCheckpointSnapshot, createInitialState, updateStoryState } from "./storyState.js";

function jsonResponse(body, init = 200) {
  const status = typeof init === "number" ? init : init.status;
  const headers = new Headers(init?.headers || { "content-type": "application/json" });
  return new Response(JSON.stringify(body, null, 2), { status, headers });
}

async function handleUpdate(request, env, storyId) {
  const payload = await request.json();
  const {
    newChapterText,
    branchChoiceLabel,
    resolvedAt,
    votesSinceLastCheckpoint,
    checkpointInterval
  } = payload;

  const current = (await loadState(env, storyId)) ?? createInitialState();
  const next = await updateStoryState(current, {
    newChapterText,
    branchChoiceLabel,
    resolvedAt,
    votesSinceLastCheckpoint,
    checkpointInterval
  });

  await saveState(env, storyId, next);
  return jsonResponse({ storyId, state: next });
}

async function handleGetStory(env, storyId) {
  const state = (await loadState(env, storyId)) ?? createInitialState();
  return jsonResponse({ storyId, state });
}

async function handleRecap(env, storyId) {
  const state = (await loadState(env, storyId)) ?? createInitialState();
  return jsonResponse({ storyId, recap: buildPreviouslyOnParagraph(state) });
}

function notFound() {
  return jsonResponse({ error: "Not Found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [_, api, storySegment, storyId, action] = url.pathname.split("/");

    if (api !== "api" || storySegment !== "story" || !storyId) {
      return notFound();
    }

    if (request.method === "POST" && action === "update") {
      return handleUpdate(request, env, storyId);
    }

    if (request.method === "GET" && action === "recap") {
      return handleRecap(env, storyId);
    }

    if (request.method === "GET" && !action) {
      return handleGetStory(env, storyId);
    }

    return notFound();
  }
};

export { buildPreviouslyOnParagraph, buildCheckpointSnapshot };
