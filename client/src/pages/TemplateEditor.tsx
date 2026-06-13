import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTemplate, getTemplate, updateTemplate, uploadAttachment, deleteAttachment } from "../lib/api";
import toast from "react-hot-toast";
import { Eye, Code, Bold, Italic, Link, List, Paperclip, X, FileIcon } from "lucide-react";

interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: template } = useQuery({
    queryKey: ["template", id],
    queryFn: () => getTemplate(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setBody(template.htmlBody);
      setAttachments(template.attachments || []);
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (id) return updateTemplate(id, data);
      return createTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(id ? "Template updated!" : "Template created!");
      navigate("/templates");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save template");
    },
  });

  const handleSave = () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    if (!body.trim()) {
      toast.error("Email body is required");
      return;
    }
    saveMutation.mutate({ name, subject, htmlBody: body });
  };

  const insertTag = (tag: string) => {
    const textarea = document.getElementById("email-body") as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.substring(start, end);

    let insertion = "";
    switch (tag) {
      case "bold":
        insertion = `<strong>${selected || "text"}</strong>`;
        break;
      case "italic":
        insertion = `<em>${selected || "text"}</em>`;
        break;
      case "link":
        insertion = `<a href="url">${selected || "link text"}</a>`;
        break;
      case "list":
        insertion = `\n<ul>\n  <li>${selected || "item"}</li>\n</ul>`;
        break;
      case "name":
        insertion = "{{name}}";
        break;
      case "email":
        insertion = "{{email}}";
        break;
    }

    const newBody = body.substring(0, start) + insertion + body.substring(end);
    setBody(newBody);
  };

  // Convert plain-ish text to basic HTML for preview
  const getPreviewHtml = () => {
    // If body already has HTML tags, use as-is; otherwise wrap lines in <p>
    if (body.includes("<") && body.includes(">")) {
      return body
        .replace(/\{\{name\}\}/g, '<span style="color:#4f46e5;font-weight:bold">John Doe</span>')
        .replace(/\{\{email\}\}/g, '<span style="color:#4f46e5;font-weight:bold">john@example.com</span>');
    }
    return body
      .split("\n")
      .map((line) => `<p>${line || "&nbsp;"}</p>`)
      .join("")
      .replace(/\{\{name\}\}/g, '<span style="color:#4f46e5;font-weight:bold">John Doe</span>')
      .replace(/\{\{email\}\}/g, '<span style="color:#4f46e5;font-weight:bold">john@example.com</span>');
  };

  // Attachment handlers
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) {
      toast.error("Save the template first before adding attachments");
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const attachment = await uploadAttachment(id, file);
        setAttachments((prev) => [...prev, attachment]);
      }
      toast.success("Attachment(s) uploaded");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id) return;
    try {
      await deleteAttachment(id, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Attachment removed");
    } catch {
      toast.error("Failed to remove attachment");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{id ? "Edit Template" : "New Template"}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/templates")}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>

      {/* Name & Subject fields */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Welcome Email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Welcome {{name}}!"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
        <button onClick={() => insertTag("bold")} className="p-1.5 hover:bg-gray-200 rounded" title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button onClick={() => insertTag("italic")} className="p-1.5 hover:bg-gray-200 rounded" title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button onClick={() => insertTag("link")} className="p-1.5 hover:bg-gray-200 rounded" title="Link">
          <Link className="w-4 h-4" />
        </button>
        <button onClick={() => insertTag("list")} className="p-1.5 hover:bg-gray-200 rounded" title="List">
          <List className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-2" />
        <button
          onClick={() => insertTag("name")}
          className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 font-medium"
        >
          {"{{name}}"}
        </button>
        <button
          onClick={() => insertTag("email")}
          className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 font-medium"
        >
          {"{{email}}"}
        </button>
        <div className="ml-auto">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${
              showPreview ? "bg-indigo-100 text-indigo-700" : "hover:bg-gray-200 text-gray-600"
            }`}
          >
            {showPreview ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreview ? "Editor" : "Preview"}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="flex-1 border border-gray-200 border-t-0 rounded-b-lg p-6 bg-white overflow-auto prose prose-sm max-w-none"
          style={{ minHeight: "400px" }}
          dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
        />
      ) : (
        <textarea
          id="email-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Write your email here...\n\nHi {{name}},\n\nThank you for joining us!\n\nBest regards,\nTeam"}
          className="flex-1 border border-gray-200 border-t-0 rounded-b-lg p-4 text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          style={{ minHeight: "400px" }}
        />
      )}

      <p className="text-xs text-gray-400 mt-2">
        You can write plain text or HTML. Use {"{{name}}"} and {"{{email}}"} as placeholders.
      </p>

      {/* Attachments section */}
      <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Attachments ({attachments.length})
          </h3>
          {id ? (
            <label className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
              uploading ? "bg-gray-100 text-gray-400" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            }`}>
              {uploading ? "Uploading..." : "+ Add File"}
              <input
                type="file"
                multiple
                onChange={handleAttachmentUpload}
                disabled={uploading}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
              />
            </label>
          ) : (
            <span className="text-xs text-gray-400">Save template first to add attachments</span>
          )}
        </div>

        {attachments.length === 0 ? (
          <p className="text-xs text-gray-400">
            No attachments. Files added here will be sent with every email using this template.
          </p>
        ) : (
          <div className="space-y-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm truncate">{a.originalName}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(a.size)}</span>
                </div>
                <button
                  onClick={() => handleDeleteAttachment(a.id)}
                  className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
