import { Router } from "express";
import {
  ApplyLoan,
  getLoanDetails,
  GetLoans,
  GetUserLoans,
  markLoanAsPaid,
  PayRepayment,
  UpdateLoanStatus,
} from "../controllers/loan.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const loanRouter = Router();

loanRouter.post(
  "/apply-loan",
  isAuthenticated,
  authorizeRoles("USER"),
  ApplyLoan
);

loanRouter.get("/get-loans", isAuthenticated, GetLoans);

loanRouter.put(
  "/update-loan-status",
  isAuthenticated,
  authorizeRoles("ADMIN"),
  UpdateLoanStatus
);

loanRouter.get(
  "/get-user-loans",
  isAuthenticated,
  authorizeRoles("USER"),
  GetUserLoans
);

loanRouter.get(
  "/get-loan-details/:loanId",
  isAuthenticated,
  authorizeRoles("USER"),
  getLoanDetails
);

loanRouter.get(
  "/get-loan/:loanId",
  isAuthenticated,
  authorizeRoles("ADMIN"),
  getLoanDetails
);

loanRouter.post(
  "/pay-repayment/:repaymentId",
  isAuthenticated,
  authorizeRoles("USER"),
  PayRepayment
);

loanRouter.put("/loan/:loanId/mark-paid", isAuthenticated, markLoanAsPaid);

export default loanRouter;
