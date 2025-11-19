/**
 * Create a digestible recap for new sessions using stored summaries and checkpoints.
 */

import { summarizeChapter } from "./storyState.js";

export function buildPreviouslyOnParagraph(state, maxItems = 5) {
  if (!state) return "";
  const bulletPoints = [...state.summary_history];

  if (state.current_text) {
    bulletPoints.unshift(`Latest: ${summarizeChapter(state.current_text)}`);
  }

  const trimmed = bulletPoints.slice(0, maxItems);
  if (trimmed.length === 0) return "";

  return `Previously on TwoChoices: ${trimmed.join("; ")}.`;
}
