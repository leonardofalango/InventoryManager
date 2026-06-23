import axios from "axios";

type ApiErrorBody = {
  message?: unknown;
  title?: unknown;
  detail?: unknown;
  errors?: unknown;
};

const statusMessages: Record<number, string> = {
  400: "Os dados enviados nao foram aceitos. Confira as informacoes e tente novamente.",
  401: "Sua sessao expirou. Entre novamente para continuar.",
  403: "Voce nao tem permissao para executar esta acao.",
  404: "Registro nao encontrado.",
  409: "A operacao conflitou com dados ja existentes.",
  422: "Alguma informacao esta invalida. Corrija os campos e tente novamente.",
  500: "A API encontrou um erro interno. Tente novamente em instantes.",
};

const extractValidationErrors = (errors: unknown): string | null => {
  if (!errors) return null;

  if (Array.isArray(errors)) {
    return errors.filter(Boolean).join(" ");
  }

  if (typeof errors === "object") {
    const values = Object.values(errors as Record<string, unknown>);
    const messages = values.flatMap((value) => {
      if (Array.isArray(value)) return value.filter(Boolean).map(String);
      if (value) return [String(value)];
      return [];
    });

    return messages.length > 0 ? messages.join(" ") : null;
  }

  return String(errors);
};

export const isNetworkError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;

  return (
    !error.response ||
    error.code === "ERR_NETWORK" ||
    error.code === "ECONNABORTED" ||
    error.message.toLowerCase().includes("network")
  );
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Nao foi possivel concluir a operacao.",
) => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return navigator.onLine
      ? "Nao foi possivel conectar a API. Verifique o servidor ou tente novamente."
      : "Sem conexao com a internet. A operacao sera enviada quando a conexao voltar.";
  }

  const data = error.response.data as ApiErrorBody | string | undefined;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const validationMessage = extractValidationErrors(data.errors);
    if (validationMessage) return validationMessage;

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }

    if (typeof data.title === "string" && data.title.trim()) {
      return data.title;
    }
  }

  return statusMessages[error.response.status] ?? fallback;
};
