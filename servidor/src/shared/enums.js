export const ROLES = ["client", "coach"];
export const LOCALES = ["es", "en"];
// Superuser-toggleable modules — Sleep/BodyComp aren't built yet (always show
// the "coming soon" placeholder regardless of this flag), but are listed here
// too so the admin panel already has a row ready for when they ship.
export const MODULE_KEYS = ["nutrition", "exercise", "sleep", "bodyComp"];
// One backend serves all three fronts (local dev, the preview deploy, and
// production) sharing the same database — this lets module flags be toggled
// independently per environment instead of one shared on/off switch for all
// three. The client sends its own environment via VITE_APP_ENV (see
// cliente/src/lib/env.js); local dev defaults to "local" with no env var needed.
export const APP_ENVIRONMENTS = ["local", "preview", "production"];
export const MEAL_CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];
export const COMPLIANCE = ["yes", "no", "na"];
export const EXERCISE_FEELINGS = ["sad", "neutral", "happy"];

export const TAG_COLOR_PALETTE = [
  "blue-500", "purple-500", "red-500", "green-500", "yellow-500", "orange-500",
  "pink-500", "indigo-500", "cyan-500", "gray-700", "red-600", "stone-500",
  "emerald-600", "red-700", "teal-500", "lime-600", "amber-600", "violet-600",
  "rose-600", "sky-600",
];

export const SYSTEM_EXERCISE_TAGS = [
  { name: "Weightlifting", color: "blue-500" },
  { name: "Olympic Weightlifting", color: "purple-500" },
  { name: "Crossfit", color: "red-500" },
  { name: "Running", color: "green-500" },
  { name: "Bicycle", color: "yellow-500" },
  { name: "Movement", color: "orange-500" },
  { name: "Yoga", color: "pink-500" },
  { name: "Stretching", color: "indigo-500" },
  { name: "Swimming", color: "cyan-500" },
  { name: "Boxing", color: "gray-700" },
  { name: "Martial Arts", color: "red-600" },
  { name: "Rock Climbing", color: "stone-500" },
  { name: "Hiking", color: "emerald-600" },
  { name: "Injury", color: "red-700" },
];
