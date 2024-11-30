import express, { Request, Response, Application } from "express";
import "dotenv/config";
import cors from "cors";
import userRouter from "./routes/user.route";
import loanRouter from "./routes/loan.route";
const app: Application = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    methods: ["GET", "POST", "PUT", "DELETE"],
    origin: ["http://localhost:3000"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req: Request, res: any) => {
  return res.send("It's working 🙌");
});

app.use("/api", userRouter, loanRouter);

app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
