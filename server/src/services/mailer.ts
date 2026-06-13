import nodemailer, { Transporter } from "nodemailer";
import prisma from "../lib/prisma";

async function getTransporterForUser(userId: string): Promise<{ transporter: Transporter; fromAddress: string }> {
  const config = await prisma.smtpConfig.findUnique({ where: { userId } });

  if (!config) {
    throw new Error("SMTP not configured. Please set up your email account in Settings.");
  }

  // secure=true ONLY for port 465; port 587 uses STARTTLS (secure=false)
  const useSecure = config.port === 465;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: useSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  const fromAddress = config.fromName
    ? `"${config.fromName}" <${config.smtpUser}>`
    : config.smtpUser;

  return { transporter, fromAddress };
}

export interface MailAttachment {
  filename: string;
  path: string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

export async function sendMail(options: SendMailOptions, userId: string): Promise<void> {
  const { transporter, fromAddress } = await getTransporterForUser(userId);

  await transporter.sendMail({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments?.map((a) => ({
      filename: a.filename,
      path: a.path,
      contentType: a.contentType,
    })),
  });
}

export async function testConnection(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { transporter } = await getTransporterForUser(userId);
    await transporter.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Replace template variables like {{name}}, {{email}} with actual values
 */
export function interpolateTemplate(
  html: string,
  variables: Record<string, string>
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}
