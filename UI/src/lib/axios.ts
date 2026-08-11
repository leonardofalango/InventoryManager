import axios, { type AxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import { useFeedbackStore } from "../store/feedbackStore";
import { getApiErrorMessage } from "./httpError";

export interface ApiRequestConfig extends AxiosRequestConfig {
  showFeedback?: boolean;
}

const apiBaseUrl = String(import.meta.env.VITE_API_URL || "").replace(
  /\/+$/,
  "",
);

const redirectToLogin = () => {
  if (window.location.hash !== "#/login") {
    window.location.hash = "#/login";
  }
};

export const api = axios.create({
  baseURL: apiBaseUrl ? `${apiBaseUrl}/api` : "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config as ApiRequestConfig | undefined;
    const errorMessage = getApiErrorMessage(
      error,
      "Nao foi possivel concluir a operacao.",
    );

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      useAuthStore.getState().logout();

      if (!config?.url?.includes("/auth/login")) {
        window.setTimeout(redirectToLogin, 1500);
      }
    }

    if (config?.showFeedback !== false) {
      useFeedbackStore.getState().showFeedback(errorMessage, "error");
    }

    return Promise.reject(error);
  },
);
