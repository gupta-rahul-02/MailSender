import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth
export const signup = (data: { email: string; password: string; name: string }) =>
  api.post("/auth/signup", data).then((r) => r.data);
export const login = (data: { email: string; password: string }) =>
  api.post("/auth/login", data).then((r) => r.data);
export const getMe = () => api.get("/auth/me").then((r) => r.data);

// Templates
export const getTemplates = () => api.get("/templates").then((r) => r.data);
export const getTemplate = (id: string) => api.get(`/templates/${id}`).then((r) => r.data);
export const createTemplate = (data: any) => api.post("/templates", data).then((r) => r.data);
export const updateTemplate = (id: string, data: any) => api.put(`/templates/${id}`, data).then((r) => r.data);
export const deleteTemplate = (id: string) => api.delete(`/templates/${id}`);

// Campaigns
export const getCampaigns = () => api.get("/campaigns").then((r) => r.data);
export const getCampaign = (id: string) => api.get(`/campaigns/${id}`).then((r) => r.data);
export const createCampaign = (data: { name: string; templateId: string }) => api.post("/campaigns", data).then((r) => r.data);
export const deleteCampaign = (id: string) => api.delete(`/campaigns/${id}`);
export const uploadRecipients = (campaignId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/campaigns/${campaignId}/recipients/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};
export const confirmRecipients = (campaignId: string, recipients: any[]) =>
  api.post(`/campaigns/${campaignId}/recipients/confirm`, { recipients }).then((r) => r.data);
export const sendCampaign = (id: string) => api.post(`/campaigns/${id}/send`).then((r) => r.data);
export const scheduleCampaign = (id: string, scheduledAt: string) =>
  api.post(`/campaigns/${id}/schedule`, { scheduledAt }).then((r) => r.data);

// Attachments
export const uploadAttachment = (templateId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/templates/${templateId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};
export const deleteAttachment = (templateId: string, attachmentId: string) =>
  api.delete(`/templates/${templateId}/attachments/${attachmentId}`);

// Settings
export const getSmtpConfig = () => api.get("/settings/smtp").then((r) => r.data);
export const saveSmtpConfig = (data: any) => api.post("/settings/smtp", data).then((r) => r.data);
export const testSmtp = () => api.post("/settings/smtp/test").then((r) => r.data);
