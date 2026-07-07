// Shared by ExerciseHomeScreen (the filter control lives there) and
// ExerciseCalendarScreen (which reads the stored value to lay out its grid).
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEK_STARTS_ON_KEY = "exercise.weekStartsOn";

export function readWeekStartsOn() {
  const saved = Number(localStorage.getItem(WEEK_STARTS_ON_KEY));
  return saved >= 0 && saved <= 6 ? saved : 1; // default Monday
}

export function writeWeekStartsOn(day) {
  localStorage.setItem(WEEK_STARTS_ON_KEY, String(day));
}
