import { useDispatch, useSelector } from "react-redux";
import { createNewMessage, getAllMessages, getAiReply } from "../../../apiCalls/message";
import { hideLoader, showLoader } from "../../../redux/loaderSlice";
import toast from "react-hot-toast";
import { useCallback, useEffect, useState } from "react";
import { clearUnreadMessageCount } from "../../../apiCalls/chat";
import moment from "moment";
import store from "../../../redux/store";
import { setAllChats } from "../../../redux/usersSlice";
import EmojiPicker from "emoji-picker-react";

// --- AI Suggestion Component ---
const AiSuggestion = ({ suggestion, onUse, onDismiss }) => {
    if (!suggestion) return null;
    return (
        <div className="ai-suggestion-bubble">
            <span className="ai-suggestion-text">{suggestion}</span>
            <div className="ai-suggestion-actions">
                <button className="ai-btn-use" onClick={onUse}>Use</button>
                <button className="ai-btn-dismiss" onClick={onDismiss}>✕</button>
            </div>
        </div>
    );
};

function ChatArea({ socket }) {
    const dispatch = useDispatch();
    const { selectedChat, user } = useSelector(state => state.userReducer);
    const selectedUser = selectedChat?.members?.find(u => u._id !== user._id);

    const [message, setMessage] = useState("");
    const [allMessages, setAllMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [data, setData] = useState(null);
    const [aiSuggestion, setAiSuggestion] = useState("");

    const handleAiReply = async () => {
        const lastMsg = allMessages[allMessages.length - 1]?.text;
        if (!lastMsg) {
            toast.error("No previous message to reply to!");
            return;
        }
        dispatch(showLoader());
        const response = await getAiReply(lastMsg);
        dispatch(hideLoader());
        if (response.success) {
            setAiSuggestion(response.data);
        } else {
            toast.error("Failed to generate reply");
        }
    };

    const sendMessage = async (image) => {
        try {
            const newMessage = { chatId: selectedChat._id, sender: user._id, text: message, image };
            socket.emit("send-message", { ...newMessage, members: selectedChat.members.map(m => m._id), read: false, createdAt: moment().format("YYYY-MM-DD HH:mm:ss") });
            const response = await createNewMessage(newMessage);
            if (response.success) {
                setMessage("");
                setShowEmojiPicker(false);
                setAiSuggestion("");
            }
        } catch (error) { toast.error(error.message); }
    };

    const formatTime = (timestamp) => {
        const now = moment();
        const diff = now.diff(moment(timestamp), "days");
        if (diff < 1) return `Today ${moment(timestamp).format("hh:mm A")}`;
        if (diff === 1) return `Yesterday ${moment(timestamp).format("hh:mm A")}`;
        return moment(timestamp).format("MMM D, hh:mm A");
    };

    const getMessages = useCallback(async () => {
        if (!selectedChat?._id) return;
        try {
            dispatch(showLoader());
            const response = await getAllMessages(selectedChat._id);
            dispatch(hideLoader());
            if (response.success) setAllMessages(response.data);
        } catch (error) { dispatch(hideLoader()); toast.error(error.message); }
    }, [selectedChat?._id, dispatch]);

    const clearUnreadMessages = useCallback(async () => {
        if (!selectedChat?._id) return;
        try {
            socket.emit("clear-unread-messages", { chatId: selectedChat._id, members: selectedChat.members.map(m => m._id) });
            const response = await clearUnreadMessageCount(selectedChat._id);
            if (response.success) {
                const currentAllChats = store.getState().userReducer.allChats;
                const updatedChats = currentAllChats.map(chat => chat._id === selectedChat._id ? response.data : chat);
                dispatch(setAllChats(updatedChats));
            }
        } catch (error) { toast.error(error.message); }
    }, [selectedChat?._id, selectedChat?.members, socket, dispatch]);

    const sendImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => sendMessage(reader.result);
    };

    useEffect(() => {
        if (!selectedChat?._id) return;
        getMessages();
        if (selectedChat?.lastMessage?.sender !== user._id) clearUnreadMessages();
        const handleReceiveMessage = (message) => {
            const currentChat = store.getState().userReducer.selectedChat;
            if (currentChat?._id === message.chatId) setAllMessages(prev => [...prev, message]);
            if (currentChat?._id === message.chatId && message.sender !== user._id) clearUnreadMessages();
        };
        socket.on("receive-message", handleReceiveMessage);
        socket.on("message-count-cleared", (data) => {
            const currentChat = store.getState().userReducer.selectedChat;
            const allChatsState = store.getState().userReducer.allChats;
            if (currentChat?._id === data.chatId) {
                const updatedChats = allChatsState.map(chat => chat._id === data.chatId ? { ...chat, unreadMessageCount: 0 } : chat);
                dispatch(setAllChats(updatedChats));
                setAllMessages(prev => prev.map(msg => ({ ...msg, read: true })));
            }
        });
        socket.on("started-typing", (typingData) => {
            setData(typingData);
            if (selectedChat?._id === typingData.chatId && typingData.sender !== user._id) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 2000);
            }
        });
        return () => {
            socket.off("receive-message", handleReceiveMessage);
            socket.off("message-count-cleared");
            socket.off("started-typing");
        };
    }, [selectedChat?._id, user._id, socket, getMessages, clearUnreadMessages]);

    useEffect(() => {
        const container = document.getElementById("main-chat-area");
        if (container) container.scrollTop = container.scrollHeight;
    }, [allMessages, isTyping]);

    return (
        <>
            {selectedChat && (
                <div className="app-chat-area">
                    <div className="app-chat-area-header">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{selectedUser && `${selectedUser.firstname} ${selectedUser.lastname}`}</span>
                        </div>
                    </div>
                    <div className="main-chat-area" id="main-chat-area">
                        {allMessages.map((msg, i) => {
                            const isMe = msg.sender === user._id;
                            return (
                                <div key={i} className="message-container" style={{ justifyContent: isMe ? "end" : "start" }}>
                                    <div>
                                        <div className={isMe ? "send-message" : "received-message"}>
                                            <div>{msg.text}</div>
                                            {msg.image && <img src={msg.image} alt="chat" height="120" width="120" />}
                                        </div>
                                        <div className="message-timestamp" style={{ float: isMe ? "right" : "left" }}>{formatTime(msg.createdAt)}</div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="typing-indicator">{isTyping && selectedChat?.members.map(m => m._id).includes(data?.sender) && (<i>typing...</i>)}</div>
                    </div>
                    {showEmojiPicker && <EmojiPicker onEmojiClick={(e) => setMessage(prev => prev + e.emoji)} />}
                    
                    <AiSuggestion suggestion={aiSuggestion} onUse={() => { setMessage(aiSuggestion); setAiSuggestion(""); }} onDismiss={() => setAiSuggestion("")} />

                    <div className="send-message-div">
                        <input type="text" className="send-message-input" placeholder="Type a message" value={message} onChange={e => { setMessage(e.target.value); socket.emit("user-typing", { chatId: selectedChat._id, members: selectedChat.members.map(m => m._id), sender: user._id }); }} />
                        <label htmlFor="file"><i className="fa fa-picture-o send-image-btn"></i><input type="file" id="file" style={{ display: "none" }} accept="image/*" onChange={sendImage} /></label>
                        <button className="fa fa-smile-o send-emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                        <button className="fa fa-magic send-ai-btn" onClick={handleAiReply} title="AI Smart Reply" />
                        <button className="fa fa-paper-plane send-message-btn" onClick={() => sendMessage("")} />
                    </div>
                </div>
            )}
        </>
    );
}
export default ChatArea;