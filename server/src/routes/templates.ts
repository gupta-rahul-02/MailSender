import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

export const templateRoutes = Router();

// Attachment upload config
const attachDir = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, "attachments")
  : path.join(__dirname, "../../attachments");
if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });

const attachStorage = multer.diskStorage({
  destination: attachDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const attachUpload = multer({
  storage: attachStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
});

// GET all templates (user's own)
templateRoutes.get("/", async (req: AuthRequest, res: Response) => {
  const templates = await prisma.template.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: { attachments: true },
  });
  res.json(templates);
});

// GET single template
templateRoutes.get("/:id", async (req: AuthRequest, res: Response) => {
  const template = await prisma.template.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { attachments: true },
  });
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

// POST create template
templateRoutes.post("/", async (req: AuthRequest, res: Response) => {
  const { name, subject, htmlBody, design, variables } = req.body;

  if (!name || !subject || !htmlBody) {
    res.status(400).json({ error: "name, subject, and htmlBody are required" });
    return;
  }

  const template = await prisma.template.create({
    data: {
      name,
      subject,
      htmlBody,
      design: design || null,
      variables: variables || extractVariables(htmlBody + " " + subject),
      userId: req.userId!,
    },
  });
  res.status(201).json(template);
});

// PUT update template
templateRoutes.put("/:id", async (req: AuthRequest, res: Response) => {
  const { name, subject, htmlBody, design, variables } = req.body;

  // Verify ownership
  const existing = await prisma.template.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const template = await prisma.template.update({
    where: { id: req.params.id },
    data: {
      name,
      subject,
      htmlBody,
      design: design || undefined,
      variables: variables || extractVariables((htmlBody || "") + " " + (subject || "")),
    },
  });
  res.json(template);
});

// DELETE template
templateRoutes.delete("/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.template.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  await prisma.template.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// POST upload attachment to template
templateRoutes.post(
  "/:id/attachments",
  attachUpload.single("file"),
  async (req: AuthRequest, res: Response) => {
    const template = await prisma.template.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const attachment = await prisma.attachment.create({
      data: {
        templateId: template.id,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
      },
    });

    res.status(201).json(attachment);
  }
);

// DELETE attachment
templateRoutes.delete("/:id/attachments/:attachmentId", async (req: AuthRequest, res: Response) => {
  const template = await prisma.template.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id: req.params.attachmentId, templateId: template.id },
  });
  if (!attachment) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }

  // Delete file from disk
  fs.unlink(attachment.path, () => {});

  await prisma.attachment.delete({ where: { id: attachment.id } });
  res.status(204).send();
});

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  const vars = matches.map((m) => m.replace(/[{}]/g, ""));
  return [...new Set(vars)];
}
