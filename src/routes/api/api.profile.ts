import { Router } from "express";
import { exportProfileQueriesValidation, getProfilesQueriesValidation } from "../../middlewares/app.validation";
import {
  addProfile,
  exportProfiles,
  getProfilesWithSearchQueries,
  getProfileWithFiltering,
  getSingleProfile,
} from "../../controllers/profile.controller";
import { authenticate } from "../../middlewares/verifyJwt";
import { requireRole } from "../../middlewares/authorize";

const router = Router();

router
  .route("/profiles")
  .get(authenticate, getProfilesQueriesValidation, getProfileWithFiltering)
  .post(authenticate, requireRole("admin"), addProfile);
  router.get("/profiles/export", authenticate, exportProfileQueriesValidation, exportProfiles);
  router.get("/profiles/search", authenticate, getProfilesWithSearchQueries);
  router.get("/profiles/:id", authenticate, getSingleProfile )

export default router;
