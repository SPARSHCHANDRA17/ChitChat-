import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { createNewChat } from "../../../apiCalls/chat";
import { hideLoader, showLoader } from "../../../redux/loaderSlice";
import { setAllChats, setSelectedChat } from "../../../redux/usersSlice";
import moment from "moment";
import { useEffect } from "react";
import store from "../../../redux/store";

function UsersList({ searchKey, socket, onlineUser = [] }) {
    const {
        allUsers = [],
        allChats = [],
        user: currentUser,
        selectedChat
    } = useSelector(state => state.userReducer);

    const dispatch = useDispatch();

    const startNewChat = async (searchedUserId) => {
        try {
            dispatch(showLoader());

            const response = await createNewChat([
                currentUser._id,
                searchedUserId
            ]);

            dispatch(hideLoader());

            if (response.success) {
                toast.success(response.message);

                const newChat = response.data;

                dispatch(setAllChats([...allChats, newChat]));
                dispatch(setSelectedChat(newChat));
            }
        } catch (error) {
            dispatch(hideLoader());
            toast.error(error?.message || "Something went wrong");
        }
    };

    const openChat = (selectedUserId) => {
        if (!selectedUserId) return;
        const chat = allChats.find(chat =>
            chat?.members
                ?.map(m => m?._id)
                .includes(currentUser?._id) &&
            chat?.members
                ?.map(m => m?._id)
                .includes(selectedUserId)
        );

        if (chat) {
            dispatch(setSelectedChat(chat));
        }
    };

    const isSelectedChat = (targetUser) => {
        if (!targetUser?._id || !selectedChat?.members) return false;
        return selectedChat.members
            .map(m => m?._id)
            .includes(targetUser._id);
    };

    const getLastMessageTimeStamp = (userId) => {
        if (!userId) return "";
        const chat = allChats.find(chat =>
            chat?.members
                ?.map(m => m?._id)
                .includes(userId)
        );

        if (!chat?.lastMessage) return "";

        return moment(chat.lastMessage.createdAt).format("hh:mm A");
    };

    const getLastMessage = (userId) => {
        if (!userId) return "";
        const chat = allChats.find(chat =>
            chat?.members
                ?.map(m => m?._id)
                .includes(userId)
        );

        if (!chat?.lastMessage) return "";

        const prefix =
            chat.lastMessage.sender === currentUser?._id
                ? "You: "
                : "";

        return prefix + (chat.lastMessage.text || "").substring(0, 25);
    };

    const formatName = (targetUser) => {
        if (!targetUser) return "";

        const fname =
            targetUser.firstname?.charAt(0)?.toUpperCase() +
            targetUser.firstname?.slice(1)?.toLowerCase();

        const lname =
            targetUser.lastname?.charAt(0)?.toUpperCase() +
            targetUser.lastname?.slice(1)?.toLowerCase();

        return `${fname || ""} ${lname || ""}`.trim() || targetUser.email || "";
    };

    useEffect(() => {
        if (!socket) return;

        const handleMessageCount = (message) => {
            const currentSelectedChat = store.getState().userReducer.selectedChat;
            const chats = store.getState().userReducer.allChats || [];

            let updatedChats = chats;

            if (currentSelectedChat?._id !== message.chatId) {
                updatedChats = chats.map(chat => {
                    if (chat?._id === message.chatId) {
                        return {
                            ...chat,
                            unreadMessageCount:
                                (chat.unreadMessageCount || 0) + 1,
                            lastMessage: message
                        };
                    }
                    return chat;
                });
            }

            const latestChat = updatedChats.find(
                chat => chat?._id === message.chatId
            );

            const otherChats = updatedChats.filter(
                chat => chat?._id !== message.chatId
            );

            const finalChatsArray = [];
            if (latestChat) finalChatsArray.push(latestChat);
            finalChatsArray.push(...otherChats);

            dispatch(setAllChats(finalChatsArray));
        };

        socket.on("set-message-count", handleMessageCount);

        return () => {
            socket.off("set-message-count", handleMessageCount);
        };
    }, [socket, dispatch]);

    const getUnreadMessageCount = (userId) => {
        if (!userId) return null;
        const chat = allChats.find(chat =>
            chat?.members
                ?.map(m => m?._id)
                .includes(userId)
        );

        if (
            chat &&
            chat.unreadMessageCount &&
            chat.lastMessage?.sender !== currentUser?._id
        ) {
            return (
                <div className="unread-message-counter">
                    {chat.unreadMessageCount}
                </div>
            );
        }

        return null;
    };

    const getData = () => {
        if (!searchKey) return allChats;

        return allUsers.filter(u =>
            u?.firstname
                ?.toLowerCase()
                .includes(searchKey.toLowerCase()) ||
            u?.lastname
                ?.toLowerCase()
                .includes(searchKey.toLowerCase())
        );
    };

    return getData()
        .map(obj => {
            let targetUser = obj;

            if (obj?.members) {
                targetUser = obj.members.find(
                    m => m?._id !== currentUser?._id
                );
            }

            if (!targetUser || !targetUser._id) return null;

            return (
                <div
                    className="user-search-filter"
                    onClick={() => openChat(targetUser._id)}
                    key={targetUser._id}
                >
                    <div
                        className={
                            isSelectedChat(targetUser)
                                ? "selected-user"
                                : "filtered-user"
                        }
                    >
                        <div className="filter-user-display">
                            {targetUser.profilePic ? (
                                <img
                                    src={targetUser.profilePic}
                                    alt="profile"
                                    className="user-profile-image"
                                    style={
                                        onlineUser?.includes(targetUser._id)
                                            ? { border: "#82e0aa 3px solid" }
                                            : {}
                                    }
                                />
                            ) : (
                                <div
                                    className={
                                        isSelectedChat(targetUser)
                                            ? "user-selected-avatar"
                                            : "user-default-avatar"
                                    }
                                    style={
                                        onlineUser?.includes(targetUser._id)
                                            ? { border: "#82e0aa 3px solid" }
                                            : {}
                                    }
                                >
                                    {targetUser.firstname?.charAt(0)}
                                    {targetUser.lastname?.charAt(0)}
                                </div>
                            )}

                            <div className="filter-user-details">
                                <div className="user-display-name">
                                    {formatName(targetUser)}
                                </div>
                                <div className="user-display-email">
                                    {getLastMessage(targetUser._id) || targetUser.email}
                                </div>
                            </div>

                            <div>
                                {getUnreadMessageCount(targetUser._id)}
                                <div className="last-message-timestamp">
                                    {getLastMessageTimeStamp(targetUser._id)}
                                </div>
                            </div>

                            {!allChats.find(chat =>
                                chat?.members
                                    ?.map(m => m?._id)
                                    .includes(targetUser._id)
                            ) && (
                                <div className="user-start-chat">
                                    <button
                                        className="user-start-chat-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startNewChat(targetUser._id);
                                        }}
                                    >
                                        Start Chat
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        })
        .filter(Boolean);
}

export default UsersList;