import { axiosInstance, url } from './index';

export const createNewMessage = async ( message ) => {
    try{
        const response = await axiosInstance.post(url + '/api/message/new-message', message);
        return response.data;
    }catch(error){
        return error;
    }
}

export const getAllMessages = async ( chatId ) => {
    try{
        const response = await axiosInstance.get(url + `/api/message/get-all-messages/${chatId}`);
        return response.data;
    }catch(error){
        return error;
    }
}
export const getAiReply = async (lastMessage) => {
    try {
        const response = await axiosInstance.post('/api/ai/suggest-reply', { lastMessage });
        return response.data;
    } catch (error) {
        return error;
    }
}