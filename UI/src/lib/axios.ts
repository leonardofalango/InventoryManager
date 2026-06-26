import axios, { type AxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import { useFeedbackStore } from "../store/feedbackStore";
import { getApiErrorMessage } from "./httpError";

export interface ApiRequestConfig extends AxiosRequestConfig {
  showFeedback?: boolean;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api",
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
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }

    if (config?.showFeedback !== false) {
      useFeedbackStore.getState().showFeedback(errorMessage, "error");
    }

    return Promise.reject(error);
  },
);
