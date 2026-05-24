import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: "https://chitchat-n2th.onrender.com",
    headers: {
        authorization: `Bearer ${localStorage.getItem('token')}`
    }
});