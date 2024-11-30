import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import prisma from "../config/db.config.js";
import "dotenv/config";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CatchAsyncError } from "../middleware/catchAsyncErrors.ts.js";
import ErrorHandler from "../utils/ErrorHandler.js";

interface RegisterProps {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
}

export const Register = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body: RegisterProps = req.body;

      if (!body.email || !body.name || !body.password) {
        return res
          .status(400)
          .json({ message: "Email, name, and password are required!" });
      }

      let findUser = await prisma.user.findUnique({
        where: {
          email: body.email,
        },
      });

      if (findUser) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(body.password, 10);

      if (!findUser) {
        const role =
          body.role?.toUpperCase() === "ADMIN" ? Role.ADMIN : Role.USER; // Use Role enum explicitly

        findUser = await prisma.user.create({
          data: {
            email: body.email,
            name: body.name,
            password: hashedPassword,
            role,
          },
        });

        return res.status(201).json({
          message: "User Register successfully!",
        });
      }
    } catch (error) {
      console.error("Error during login:", error);
      return res
        .status(500)
        .json({ message: "Something went wrong. Please try again!" });
    }
  }
);

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password }: ILoginRequest = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Please enter email and password" });
      }

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET!,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        message: "Login successful",
        user,
        token: `Bearer ${accessToken}`,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
