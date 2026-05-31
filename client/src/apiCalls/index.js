import axios from "axios";

export const url = "https://chitchat-v9ow.onrender.com"; 

export const axiosInstance = axios.create({
    baseURL: url,
    headers: {
        authorization: `Bearer ${localStorage.getItem('token')}`
    }
});