import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSmtpConfig, saveSmtpConfig, testSmtp } from "../lib/api";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const [host, setHost] = useState("smtp.gmail.com");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [fromName, setFromName] = useState("");

  const { data: config } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: getSmtpConfig,
  });

  useEffect(() => {
    if (config?.configured) {
      setHost(config.host);
      setPort(String(config.port));
      setSecure(config.secure);
      setUser(config.user);
      setFromName(config.fromName || "");
      // Don't prefill password for security
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => saveSmtpConfig({ host, port: Number(port), secure, user, pass, fromName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
      toast.success("SMTP configuration saved!");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to save"),
  });

  const testMutation = useMutation({
    mutationFn: testSmtp,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Connection successful! SMTP is working.");
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    },
    onError: () => toast.error("Failed to test connection"),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pass) {
      toast.error("Email and password are required");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sender Email Account (SMTP)</h2>
          {config?.configured && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Configured
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Configure the email account that will be used to send campaigns. For Gmail, use an{" "}
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            App Password
          </a>{" "}
          (requires 2FA enabled).
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="587"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="your-email@gmail.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password / App Password
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder={config?.configured ? "••••••••  (enter new to update)" : "Enter app password"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Name (optional)
            </label>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="e.g., My Company"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Recipients will see this as the sender name
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="secure"
              checked={secure}
              onChange={(e) => setSecure(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="secure" className="text-sm text-gray-700">
              Use SSL/TLS (port 465). Leave unchecked for STARTTLS (port 587).
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </button>
            <button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !config?.configured}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {testMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : testMutation.data?.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : testMutation.data?.success === false ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : null}
              Test Connection
            </button>
          </div>
        </form>
      </div>

      {/* Gmail instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">Gmail Setup Instructions</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Enable 2-Step Verification on your Google account</li>
          <li>
            Go to{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              App Passwords
            </a>
          </li>
          <li>Create a new app password (select "Mail")</li>
          <li>Copy the 16-character password and paste it above</li>
          <li>Host: smtp.gmail.com, Port: 587, SSL: unchecked</li>
        </ol>
      </div>
    </div>
  );
}
