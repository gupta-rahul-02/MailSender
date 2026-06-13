import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getCampaigns, getTemplates } from "../lib/api";
import { FileText, Send, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: getCampaigns });
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: getTemplates });

  const totalSent = campaigns.reduce((sum: number, c: any) => sum + (c.stats?.sent || 0), 0);
  const totalFailed = campaigns.reduce((sum: number, c: any) => sum + (c.stats?.failed || 0), 0);
  const scheduled = campaigns.filter((c: any) => c.status === "SCHEDULED").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} label="Templates" value={templates.length} color="indigo" />
        <StatCard icon={Send} label="Campaigns" value={campaigns.length} color="blue" />
        <StatCard icon={CheckCircle} label="Emails Sent" value={totalSent} color="green" />
        <StatCard icon={AlertCircle} label="Failed" value={totalFailed} color="red" />
      </div>

      {/* Recent campaigns */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Campaigns</h2>
          <Link to="/campaigns/new" className="text-sm text-indigo-600 hover:text-indigo-700">
            + New Campaign
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-gray-500 text-sm">No campaigns yet. Create your first one!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Name</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Recipients</th>
                <th className="pb-2">Sent</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 5).map((c: any) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-3">
                    <Link to={`/campaigns/${c.id}`} className="text-indigo-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.stats?.total || 0}</td>
                  <td>{c.stats?.sent || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
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
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ""}`}>
      {status}
    </span>
  );
}
