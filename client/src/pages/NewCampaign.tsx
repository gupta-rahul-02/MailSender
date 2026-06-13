import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTemplates,
  createCampaign,
  uploadRecipients,
  confirmRecipients,
  sendCampaign,
  scheduleCampaign,
} from "../lib/api";
import toast from "react-hot-toast";
import { Upload, Send, Clock } from "lucide-react";

interface Recipient {
  email: string;
  name: string;
}

export default function NewCampaign() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "manual">("file");
  const [manualInput, setManualInput] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
  });

  // Step 1: Create campaign
  const createMutation = useMutation({
    mutationFn: () => createCampaign({ name: campaignName, templateId }),
    onSuccess: (data) => {
      setCampaignId(data.id);
      setStep(2);
      toast.success("Campaign created");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed"),
  });

  // Step 2: Upload recipients
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadRecipients(campaignId, file);
      setRecipients(result.recipients);
      toast.success(`Found ${result.count} recipients`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to parse file");
    }
  };

  // Manual input parse
  const handleManualParse = () => {
    const lines = manualInput.split("\n").filter((l) => l.trim());
    const parsed: Recipient[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const email = parts[0];
      const name = parts[1] || "";

      if (email && emailRegex.test(email)) {
        parsed.push({ email, name });
      }
    }

    if (parsed.length === 0) {
      toast.error("No valid email addresses found");
      return;
    }

    setRecipients(parsed);
    toast.success(`Parsed ${parsed.length} recipients`);
  };

  // Step 3: Confirm and send
  const confirmMutation = useMutation({
    mutationFn: () => confirmRecipients(campaignId, recipients),
    onSuccess: () => {
      setStep(3);
      toast.success("Recipients confirmed");
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => sendCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign sending started!");
      navigate(`/campaigns/${campaignId}`);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () => scheduleCampaign(campaignId, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign scheduled!");
      navigate(`/campaigns/${campaignId}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to schedule"),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">New Campaign</h1>

      {/* Progress steps */}
      <div className="flex items-center gap-4 mb-8">
        {["Details", "Recipients", "Send"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > i + 1
                  ? "bg-green-100 text-green-700"
                  : step === i + 1
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? "font-medium" : "text-gray-400"}`}>
              {label}
            </span>
            {i < 2 && <div className="w-12 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Campaign Details */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., June Newsletter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose a template...</option>
              {templates.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.subject}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!campaignName || !templateId || createMutation.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Next: Upload Recipients
          </button>
        </div>
      )}

      {/* Step 2: Upload Recipients */}
      {step === 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {/* Tab toggle */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setInputMode("file")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                inputMode === "file"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setInputMode("manual")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                inputMode === "manual"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Enter Manually
            </button>
          </div>

          {/* File upload mode */}
          {inputMode === "file" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Recipient File (.xlsx, .csv, or .pdf)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-2">
                  Excel/CSV should have "Email" and "Name" columns
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleFileUpload}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* Manual input mode */}
          {inputMode === "manual" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter email addresses (one per line, optionally with name)
                </label>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={"john@example.com, John Doe\njane@example.com, Jane Smith\nalex@example.com"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 h-40 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Format: email, name (name is optional). One recipient per line.
                </p>
              </div>
              <button
                onClick={handleManualParse}
                className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200"
              >
                Parse Emails
              </button>
            </div>
          )}

          {recipients.length > 0 && (
            <>
              <div className="border rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">Email</th>
                      <th className="text-left px-3 py-2">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2">{r.name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500">{recipients.length} recipients found</p>
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                Confirm Recipients & Continue
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 3: Send or Schedule */}
      {step === 3 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="font-medium mb-1">Campaign Summary</h3>
            <p className="text-sm text-gray-500">
              "{campaignName}" → {recipients.length} recipients
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Send Now */}
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="flex flex-col items-center gap-2 p-6 border-2 border-indigo-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition"
            >
              <Send className="w-8 h-8 text-indigo-600" />
              <span className="font-medium">Send Now</span>
              <span className="text-xs text-gray-500">Send to all recipients immediately</span>
            </button>

            {/* Schedule */}
            <div className="flex flex-col items-center gap-2 p-6 border-2 border-gray-200 rounded-lg">
              <Clock className="w-8 h-8 text-yellow-600" />
              <span className="font-medium">Schedule</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
              />
              <button
                onClick={() => scheduleMutation.mutate()}
                disabled={!scheduledAt || scheduleMutation.isPending}
                className="text-sm px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
              >
                Schedule Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
