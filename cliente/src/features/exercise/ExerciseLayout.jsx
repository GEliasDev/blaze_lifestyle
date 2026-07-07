import { Outlet } from "react-router-dom";
import { ExerciseBottomNav } from "./ExerciseBottomNav.jsx";
import { useExerciseScope } from "./useExerciseScope.js";

// Each child screen owns its own AppHeader (titles differ per screen — Home
// says "Exercise Tracker", Calendar says "Calendar", etc. — same convention
// as Nutrition's screens). This layout only provides the persistent bottom
// tab bar around whichever child route is active.
export function ExerciseLayout() {
  const { linkBase } = useExerciseScope();
  return (
    <div className="h-dvh flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Outlet />
      </div>
      <ExerciseBottomNav linkBase={linkBase} />
    </div>
  );
}
