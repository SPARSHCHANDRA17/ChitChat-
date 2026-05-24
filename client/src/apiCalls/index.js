import axios from "axios";

export const url = "https://chitchat-2h7z.onrender.com";

export const axiosInstance = axios.create({
    headers: {
        authorization: `Bearer ${localStorage.getItem('token')}`
    }
});