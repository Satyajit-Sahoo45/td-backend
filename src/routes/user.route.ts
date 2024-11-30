import { Router } from "express";
import { loginUser, Register } from "../controllers/user.controller";

const userRouter = Router();

userRouter.post("/signup", Register);

userRouter.post("/login", loginUser);

export default userRouter;
