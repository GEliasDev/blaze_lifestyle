import { Frown, Meh, Smile } from "lucide-react";

// Client-side copy of servidor/src/shared/enums.js's EXERCISE_FEELINGS (see
// CLAUDE.md: "the client keeps its own copies"), paired with the Lucide icon
// each one renders as.
export const FEELINGS = [
  { value: "sad", icon: Frown, labelKey: "exercise.feelingSad" },
  { value: "neutral", icon: Meh, labelKey: "exercise.feelingNeutral" },
  { value: "happy", icon: Smile, labelKey: "exercise.feelingHappy" },
];
