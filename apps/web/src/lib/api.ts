import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;
      const status = error.response?.status;

      if (!message) {
        switch (status) {
          case 400:
            error.message = "Invalid request";
            break;
          case 401:
            error.message = "Unauthorized";
            break;
          case 403:
            error.message = "Access denied";
            break;
          case 404:
            error.message = "Not found";
            break;
          case 409:
            error.message = "Already exists";
            break;
          case 429:
            error.message = "Too many requests, try again later";
            break;
          case 500:
            error.message = "Server error, try again later";
            break;
          default:
            error.message = "Something went wrong";
        }
      } else {
        error.message = message;
      }
    }
    return Promise.reject(error);
  }
);
