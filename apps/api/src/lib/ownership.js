import { CoachClientModel } from "../modules/coaching/coachClients.model.js";
import { HttpError } from "../middleware/error.js";

export async function assertCoachOwnsClient(coachId, clientId) {
  const link = await CoachClientModel.findOne({ where: { coachId, clientId } });
  if (!link) throw new HttpError(403, "Not your client");
}
