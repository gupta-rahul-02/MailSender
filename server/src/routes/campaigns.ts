import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";
import { parseRecipientFile } from "../services/fileParser";
import { sendCampaign } from "../services/scheduler";

export const campaignRoutes = Router();

// Multer config for file uploads — preserve original extension
const uploadDir = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, "uploads")
  : path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/pdf",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || [".xlsx", ".xls", ".csv", ".pdf"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx, .xls, .csv, and .pdf files are allowed"));
    }
  },
});

// GET all campaigns
campaignRoutes.get("/", async (req: AuthRequest, res: Response) => {
  const campaigns = await prisma.campaign.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      template: { select: { name: true } },
      _count: { select: { recipients: true } },
    },
  });

  // Add recipient status counts
  const campaignsWithStats = await Promise.all(
    campaigns.map(async (c) => {
      const stats = await prisma.recipient.groupBy({
        by: ["status"],
        where: { campaignId: c.id },
        _count: true,
      });
      return {
        ...c,
        stats: {
          total: c._count.recipients,
          sent: stats.find((s) => s.status === "SENT")?._count || 0,
          failed: stats.find((s) => s.status === "FAILED")?._count || 0,
          pending: stats.find((s) => s.status === "PENDING")?._count || 0,
        },
      };
    })
  );

  res.json(campaignsWithStats);
});

// GET single campaign with recipients
campaignRoutes.get("/:id", async (req: AuthRequest, res: Response) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: {
      template: true,
      recipients: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(campaign);
});

// POST create campaign
campaignRoutes.post("/", async (req: AuthRequest, res: Response) => {
  const { name, templateId } = req.body;

  if (!name || !templateId) {
    res.status(400).json({ error: "name and templateId are required" });
    return;
  }

  const template = await prisma.template.findFirst({ where: { id: templateId, userId: req.userId! } });
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const campaign = await prisma.campaign.create({
    data: { name, templateId, userId: req.userId! },
  });
  res.status(201).json(campaign);
});

// POST upload recipients file
campaignRoutes.post(
  "/:id/recipients/upload",
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    if (campaign.status !== "DRAFT") {
      res.status(400).json({ error: "Can only upload recipients to draft campaigns" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const recipients = await parseRecipientFile(file.path, file.mimetype);

      if (recipients.length === 0) {
        res.status(400).json({ error: "No valid recipients found in file" });
        return;
      }

      // Return parsed data for preview (don't save yet)
      res.json({ recipients, count: recipients.length });
    } finally {
      // Clean up uploaded file
      fs.unlink(file.path, () => {});
    }
  }
);

// POST confirm recipients (save to DB)
campaignRoutes.post("/:id/recipients/confirm", async (req: AuthRequest, res: Response) => {
  const { recipients } = req.body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    res.status(400).json({ error: "recipients array is required" });
    return;
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  // Delete existing recipients and add new ones
  await prisma.recipient.deleteMany({ where: { campaignId: campaign.id } });

  await prisma.recipient.createMany({
    data: recipients.map((r: { email: string; name?: string }) => ({
      campaignId: campaign.id,
      email: r.email,
      name: r.name || null,
    })),
  });

  const count = await prisma.recipient.count({ where: { campaignId: campaign.id } });
  res.json({ message: "Recipients saved", count });
});

// POST send campaign immediately
campaignRoutes.post("/:id/send", async (req: AuthRequest, res: Response) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { recipients: true },
  });

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    res.status(400).json({ error: "Campaign is already sent or sending" });
    return;
  }
  if (campaign.recipients.length === 0) {
    res.status(400).json({ error: "No recipients in campaign" });
    return;
  }

  // Fire and forget — send in background
  sendCampaign(campaign.id).catch((err) =>
    console.error(`Campaign ${campaign.id} send error:`, err)
  );

  res.json({ message: "Campaign sending started" });
});

// POST schedule campaign
campaignRoutes.post("/:id/schedule", async (req: AuthRequest, res: Response) => {
  const { scheduledAt } = req.body;

  if (!scheduledAt) {
    res.status(400).json({ error: "scheduledAt is required" });
    return;
  }

  const scheduleDate = new Date(scheduledAt);
  if (scheduleDate <= new Date()) {
    res.status(400).json({ error: "scheduledAt must be in the future" });
    return;
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { recipients: true },
  });

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  if (campaign.recipients.length === 0) {
    res.status(400).json({ error: "No recipients in campaign" });
    return;
  }

  await prisma.campaign.update({
    where: { id: req.params.id },
    data: { status: "SCHEDULED", scheduledAt: scheduleDate },
  });

  res.json({ message: "Campaign scheduled", scheduledAt: scheduleDate });
});

// DELETE campaign
campaignRoutes.delete("/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  await prisma.campaign.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
