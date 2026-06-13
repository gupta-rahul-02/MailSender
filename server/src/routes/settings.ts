import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { testConnection } from "../services/mailer";

export const settingsRoutes = Router();

// GET current SMTP config (mask password)
settingsRoutes.get("/smtp", async (req: AuthRequest, res: Response) => {
  const config = await prisma.smtpConfig.findUnique({ where: { userId: req.userId! } });

  if (!config) {
    res.json({ configured: false });
    return;
  }

  res.json({
    configured: true,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.smtpUser,
    fromName: config.fromName || "",
    passHint: config.smtpPass ? "••••••••" : "",
  });
});

// POST save SMTP config
settingsRoutes.post("/smtp", async (req: AuthRequest, res: Response) => {
  const { host, port, secure, user, pass, fromName } = req.body;

  if (!host || !port || !user || !pass) {
    res.status(400).json({ error: "host, port, user, and pass are required" });
    return;
  }

  await prisma.smtpConfig.upsert({
    where: { userId: req.userId! },
    update: { host, port: Number(port), secure: Boolean(secure), smtpUser: user, smtpPass: pass, fromName: fromName || null },
    create: { userId: req.userId!, host, port: Number(port), secure: Boolean(secure), smtpUser: user, smtpPass: pass, fromName: fromName || null },
  });

  res.json({ message: "SMTP configuration saved" });
});

// POST test SMTP connection
settingsRoutes.post("/smtp/test", async (req: AuthRequest, res: Response) => {
  const result = await testConnection(req.userId!);
  res.json(result);
});
