import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getTemplates, deleteTemplate } from "../lib/api";
import { Plus, Trash2, Edit } from "lucide-react";
import toast from "react-hot-toast";

export default function Templates() {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <Link
          to="/templates/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No templates yet. Create your first email template!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: any) => (
            <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-lg mb-1">{t.name}</h3>
              <p className="text-sm text-gray-500 mb-2">Subject: {t.subject}</p>
              {t.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.variables.map((v: string) => (
                    <span key={v} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Link
                  to={`/templates/${t.id}/edit`}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
                >
                  <Edit className="w-4 h-4" /> Edit
                </Link>
                <button
                  onClick={() => {
                    if (confirm("Delete this template?")) {
                      deleteMutation.mutate(t.id);
                    }
                  }}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 ml-auto"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
