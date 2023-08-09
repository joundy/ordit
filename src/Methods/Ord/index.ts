import { api } from "../../Api";
import { findInscriptions } from "./FindInscriptions";
import { getInscription } from "./GetInscription";
import { getInscriptions } from "./GetInscriptions";
import { getLatestInscriptionIds } from "./GetLatestInscriptionIds";
import { getOrdinals } from "./GetOrdinals";
import { getOrdinalTraits } from "./GetOrdinalTraits";

api.register("FindInscriptions", findInscriptions);
api.register("GetInscription", getInscription);
api.register("GetInscriptions", getInscriptions);
api.register("GetLatestInscriptionIds", getLatestInscriptionIds);
api.register("GetOrdinals", getOrdinals);
api.register("GetOrdinalTraits", getOrdinalTraits);
