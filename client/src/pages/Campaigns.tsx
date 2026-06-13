import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getCampaigns, deleteCampaign } from "../lib/api";
import { Plus, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";

export default function Campaigns() {
  const queryClient = useQueryClient();
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link
          to="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No campaigns yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Template</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Recipients</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sent/Failed</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.template?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">{c.stats?.total || 0}</td>
                  <td className="px-4 py-3">
                    <span className="text-green-600">{c.stats?.sent || 0}</span>
                    {" / "}
                    <span className="text-red-600">{c.stats?.failed || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        to={`/campaigns/${c.id}`}
                        className="p-1 text-gray-500 hover:text-indigo-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {c.status === "DRAFT" && (
                        <button
                          onClick={() => {
                            if (confirm("Delete this campaign?")) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
