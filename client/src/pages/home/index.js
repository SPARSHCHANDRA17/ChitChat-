import { useSelector } from "react-redux";
import ChatArea from "./components/chat";
import Header from "./components/header";
import Sidebar from "./components/sidebar";
import { io } from 'socket.io-client';
import { useEffect, useState } from "react";

// Initialize socket instance safely
const socket = io('https://chitchat-v9ow.onrender.com', {
    transports: ['websocket', 'polling']
});

function Home(){
    const { selectedChat, user } = useSelector(state => state.userReducer);
    const [onlineUser, setOnlineUser] = useState([]); 

    useEffect(() => {
        if (!user) return;

        // 1. Tell the backend who we are and join our room
        socket.emit('join-room', user._id);
        socket.emit('user-login', user._id);

        // 2. Listen for the initial online users state
        socket.on('online-users', (onlineusers) => {
            setOnlineUser(onlineusers);
        });

        // 3. Listen for changes when users disconnect/connect
        socket.on('online-users-updated', (onlineusers) => {
            setOnlineUser(onlineusers);
        });

        // Clean up socket listeners cleanly when component unmounts
        return () => {
            socket.off('online-users');
            socket.off('online-users-updated');
        };
        
    }, [user?._id]); 

    return (
        <div className="home-page">
            <Header socket={socket}></Header>
            <div className="main-content">
                <Sidebar socket={socket} onlineUser={onlineUser}></Sidebar>
                {selectedChat && <ChatArea socket={socket}></ChatArea>}
            </div>
        </div>
    );
}

export default Home;