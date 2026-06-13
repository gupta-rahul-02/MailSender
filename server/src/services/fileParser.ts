import * as XLSX from "xlsx";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import path from "path";
import fs from "fs";

// Set up PDF.js worker
GlobalWorkerOptions.workerSrc = path.join(
  __dirname,
  "../../node_modules/pdfjs-dist/build/pdf.worker.mjs"
);

export interface ParsedRecipient {
  email: string;
  name: string;
}

/**
 * Parse an Excel file (.xlsx, .xls) and extract email + name columns
 */
export function parseExcel(filePath: string): ParsedRecipient[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const recipients: ParsedRecipient[] = [];

  for (const row of data) {
    const email = findColumnValue(row, ["email", "e-mail", "email address", "mail"]);
    const name = findColumnValue(row, ["name", "full name", "fullname", "recipient"]);

    if (email && isValidEmail(email)) {
      recipients.push({ email, name: name || "" });
    }
  }

  return recipients;
}

/**
 * Parse a PDF file and attempt to extract email + name from text content
 */
export async function parsePdf(filePath: string): Promise<ParsedRecipient[]> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await getDocument({ data }).promise;
  const recipients: ParsedRecipient[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => item.str)
      .join(" ");

    // Extract emails using regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];

    for (const email of emails) {
      if (isValidEmail(email)) {
        recipients.push({ email, name: "" });
      }
    }
  }

  // Deduplicate by email
  const unique = Array.from(
    new Map(recipients.map((r) => [r.email.toLowerCase(), r])).values()
  );

  return unique;
}

/**
 * Parse uploaded file based on extension or mimeType
 */
export async function parseRecipientFile(
  filePath: string,
  mimeType: string
): Promise<ParsedRecipient[]> {
  const ext = path.extname(filePath).toLowerCase();

  const excelMimes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];

  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv" || excelMimes.includes(mimeType)) {
    return parseExcel(filePath);
  }

  if (ext === ".pdf" || mimeType === "application/pdf") {
    return parsePdf(filePath);
  }

  throw new Error(`Unsupported file type: ${ext || mimeType}. Use .xlsx, .xls, .csv, or .pdf`);
}

function findColumnValue(
  row: Record<string, unknown>,
  possibleHeaders: string[]
): string {
  for (const key of Object.keys(row)) {
    if (possibleHeaders.includes(key.toLowerCase().trim())) {
      return String(row[key] ?? "").trim();
    }
  }
  return "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
