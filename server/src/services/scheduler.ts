import cron from "node-cron";
import prisma from "../lib/prisma";
import { sendMail, interpolateTemplate } from "./mailer";

// Rate limiter: max 10 concurrent emails
async function pLimit(concurrency: number) {
  const { default: limit } = await import("p-limit");
  return limit(concurrency);
}

export function startScheduler() {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      await processDueCampaigns();
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  });

  console.log("Email scheduler started (checking every minute)");
}

async function processDueCampaigns() {
  const now = new Date();

  const dueCampaigns = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
  });

  for (const campaign of dueCampaigns) {
    await sendCampaign(campaign.id);
  }
}

export async function sendCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      template: { include: { attachments: true } },
      recipients: { where: { status: "PENDING" } },
    },
  });

  if (!campaign) throw new Error("Campaign not found");

  // Mark as sending
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  const limit = await pLimit(10);
  let hasFailures = false;

  const tasks = campaign.recipients.map((recipient: any) =>
    limit(async () => {
      try {
        const variables: Record<string, string> = {
          name: recipient.name || "",
          email: recipient.email,
        };

        const html = interpolateTemplate(campaign.template.htmlBody, variables);
        const subject = interpolateTemplate(campaign.template.subject, variables);

        // Build attachments list
        const attachments = (campaign.template.attachments || []).map((a: any) => ({
          filename: a.originalName,
          path: a.path,
          contentType: a.mimeType,
        }));

        await sendMail({
          to: recipient.email,
          subject,
          html,
          attachments,
        }, campaign.userId);

        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: "SENT", sentAt: new Date() },
        });
      } catch (error: any) {
        hasFailures = true;
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            errorMessage: error.message || "Unknown error",
          },
        });
      }
    })
  );

  await Promise.all(tasks);

  // Update campaign status
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: hasFailures ? "FAILED" : "SENT",
      sentAt: new Date(),
    },
  });
}
