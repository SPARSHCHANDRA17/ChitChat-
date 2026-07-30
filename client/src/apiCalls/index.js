import axios from "axios";

export const url = "https://chitchat-2-0gd1.onrender.com"; 

export const axiosInstance = axios.create({
    baseURL: url,
    headers: {
        authorization: `Bearer ${localStorage.getItem('token')}`
    }
});