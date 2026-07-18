import { CoachClientModel } from "../modules/coaching/coachClients.model.js";
import { HttpError } from "../middleware/error.js";

// status: "approved" only — a rejected link still has a row in coach_clients
// (see coaching.service.js's reject-and-retry flow), and an unapproved
// "pending" link isn't a real relationship yet either. Without this filter,
// a coach who rejected a client (or hasn't accepted them yet) could still
// pull that client's nutrition/exercise data straight from the API even
// though the UI already hides them from the client list.
export async function assertCoachOwnsClient(coachId, clientId) {
  const link = await CoachClientModel.findOne({ where: { coachId, clientId, status: "approved" } });
  if (!link) throw new HttpError(403, "Not your client");
}
