import axios from "axios";

export const url = "https://chitchat-n2th.onrender.com";

export const axiosInstance = axios.create({
    headers: {
        authorization: `Bearer ${localStorage.getItem('token')}`
    }
});