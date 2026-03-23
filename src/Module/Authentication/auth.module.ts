import { Router } from "express";
import { registerController } from "./auth.controller";
import { validateDTO } from "../../middleware/validateDTO";
import { RegisterDTO } from "./DTO/index.dto";
import { authlimiter } from "../../utils/limit-request";

const router: Router = Router();

router.post('/register', authlimiter, validateDTO(RegisterDTO), registerController)

export default router;
