import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors.ts";
import prisma from "../config/db.config.js";

interface LoanProps {
  userId?: string;
  amount?: number;
  term?: number;
}

interface ScheduledRepaymentInput {
  amount: number;
  date: Date;
  ScheduledRepaymentStatus: "PENDING" | "APPROVED" | "PAID";
}

export const calculateRepayments = (
  amount: number,
  term: number
): ScheduledRepaymentInput[] => {
  const repayments: ScheduledRepaymentInput[] = [];
  const weeklyAmount = Math.floor((amount / term) * 100) / 100;
  const remainder = Math.round((amount - weeklyAmount * term) * 100) / 100;

  for (let i = 0; i < term; i++) {
    repayments.push({
      amount: i === term - 1 ? weeklyAmount + remainder : weeklyAmount,
      date: new Date(new Date().setDate(new Date().getDate() + (i + 1) * 7)),
      ScheduledRepaymentStatus: "PENDING",
    });
  }

  return repayments;
};

export const ApplyLoan = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, amount, term } = req.body as LoanProps;

    const parsedAmount = globalThis.Number(amount);
    const parsedTerm = globalThis.Number(term);

    if (
      !userId ||
      isNaN(parsedAmount) ||
      isNaN(parsedTerm) ||
      parsedAmount <= 0 ||
      parsedTerm <= 0
    ) {
      return res.status(400).json({ error: "Invalid loan data" });
    }

    try {
      // Calculate scheduled repayments
      const repayments = calculateRepayments(parsedAmount, parsedTerm);

      // Create the loan with repayments
      const loan = await prisma.loan.create({
        data: {
          userId,
          amount: parsedAmount,
          term: parsedTerm,
          LoanStatus: "PENDING",
          scheduledRepayments: {
            create: repayments,
          },
        },
        include: { scheduledRepayments: true },
      });

      return res.status(201).json(loan);
    } catch (error: any) {
      // Return detailed error response
      return res.status(500).json({ error: error.message });
    }
  }
);

export const GetLoans = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, page = 1, pageSize = 10 } = req.query;

    try {
      // Fetch loans based on status with pagination
      const loans = await prisma.loan.findMany({
        where: {
          LoanStatus: status ? status : (undefined as any),
        },
        skip: (parseInt(page as string) - 1) * parseInt(pageSize as string),
        take: parseInt(pageSize as string),
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      const totalCount = await prisma.loan.count({
        where: {
          LoanStatus: status ? status : (undefined as any),
        },
      });

      return res.json({
        loans,
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(pageSize as string)),
        currentPage: parseInt(page as string),
      });
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const UpdateLoanStatus = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { loanId, status } = req.body;

    if (!["PENDING", "APPROVED", "PAID"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: { LoanStatus: status },
      });

      res.json(updatedLoan);
    } catch (error) {
      res.status(500).json({ error: "Failed to update loan status" });
    }
  }
);

export const GetUserLoans = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      const loans = await prisma.loan.findMany({
        where: { userId: userId },
        include: { scheduledRepayments: true },
      });

      if (!loans || loans.length === 0) {
        return res
          .status(404)
          .json({ message: "No loans found for this user" });
      }

      return res.status(200).json(loans);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

export const getLoanDetails = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { loanId } = req.params;

    if (!loanId) {
      return res.status(400).json({ error: "Loan ID is required" });
    }

    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          scheduledRepayments: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }

      return res.status(200).json(loan);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

export const PayRepayment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { repaymentId } = req.params;

    try {
      const repayment = await prisma.scheduledRepayment.findUnique({
        where: { id: parseInt(repaymentId) },
      });

      if (!repayment) {
        return res.status(404).json({ error: "Repayment not found" });
      }

      if (repayment.ScheduledRepaymentStatus === "PAID") {
        return res.status(400).json({ error: "Repayment already paid" });
      }

      await prisma.scheduledRepayment.update({
        where: { id: parseInt(repaymentId) },
        data: { ScheduledRepaymentStatus: "PAID" },
      });

      res.status(200).json({ message: "Payment successful" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export const markLoanAsPaid = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { loanId } = req.params;

    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { scheduledRepayments: true },
      });

      if (!loan) {
        return res.status(404).json({ error: "Loan not found" });
      }

      const allRepaymentsPaid = loan.scheduledRepayments.every(
        (repayment) => repayment.ScheduledRepaymentStatus === "PAID"
      );

      if (allRepaymentsPaid) {
        await prisma.loan.update({
          where: { id: loanId },
          data: {
            LoanStatus: "PAID",
          },
        });

        return res.status(200).json({ message: "Loan status marked as PAID" });
      } else {
        return res.status(400).json({ error: "Not all repayments are done" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
