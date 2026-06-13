import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCampaign } from "../lib/api";

export default function CampaignDetail() {
  const { id } = useParams();
  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => getCampaign(id!),
    refetchInterval: (query) => {
      // Auto-refresh while sending
      const status = query.state.data?.status;
      return status === "SENDING" ? 3000 : false;
    },
  });

  if (isLoading) return <p>Loading...</p>;
  if (!campaign) return <p>Campaign not found</p>;

  const sentCount = campaign.recipients.filter((r: any) => r.status === "SENT").length;
  const failedCount = campaign.recipients.filter((r: any) => r.status === "FAILED").length;
  const pendingCount = campaign.recipients.filter((r: any) => r.status === "PENDING").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-gray-500">
            Template: {campaign.template?.name} | Created:{" "}
            {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatBox label="Total" value={campaign.recipients.length} color="gray" />
        <StatBox label="Sent" value={sentCount} color="green" />
        <StatBox label="Failed" value={failedCount} color="red" />
        <StatBox label="Pending" value={pendingCount} color="yellow" />
      </div>

      {campaign.scheduledAt && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-sm">
          Scheduled for: {new Date(campaign.scheduledAt).toLocaleString()}
        </div>
      )}

      {/* Recipients table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-medium">Recipients</h2>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Sent At</th>
                <th className="text-left px-4 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {campaign.recipients.map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{r.email}</td>
                  <td className="px-4 py-2">{r.name || "—"}</td>
                  <td className="px-4 py-2">
                    <RecipientBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {r.sentAt ? new Date(r.sentAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-red-500 text-xs">{r.errorMessage || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SCHEDULED: "bg-yellow-100 text-yellow-700",
    SENDING: "bg-blue-100 text-blue-700",
    SENT: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || ""}`}>
      {status}
    </span>
  );
}

function RecipientBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "text-gray-500",
    SENT: "text-green-600",
    FAILED: "text-red-600",
  };
  return <span className={`font-medium ${styles[status] || ""}`}>{status}</span>;
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  const bg: Record<string, string> = {
    gray: "bg-gray-50",
    green: "bg-green-50",
    red: "bg-red-50",
    yellow: "bg-yellow-50",
  };
  return (
    <div className={`rounded-lg p-4 ${bg[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}
