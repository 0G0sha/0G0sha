import { Router } from "express";
import { registerController } from "./auth.controller";
import { validateDTO } from "@/middleware/validateDTO";
import { RegisterDTO } from "./DTO/index.dto";

const router: Router = Router();

router.post('/register', validateDTO(RegisterDTO), registerController)

export default router;
