import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { createNewChat } from "../../../apiCalls/chat";
import { hideLoader, showLoader } from "../../../redux/loaderSlice";
import { setAllChats, setSelectedChat } from "../../../redux/usersSlice";
import moment from "moment";
import { useEffect } from "react";
import store from "../../../redux/store";

function UsersList({ searchKey, socket, onlineUser }) {
    const {
        allUsers,
        allChats,
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
        const chat = allChats.find(chat =>
            chat.members
                .map(m => m._id)
                .includes(currentUser._id) &&
            chat.members
                .map(m => m._id)
                .includes(selectedUserId)
        );

        if (chat) {
            dispatch(setSelectedChat(chat));
        }
    };

    const isSelectedChat = (user) => {
        return selectedChat?.members
            ?.map(m => m._id)
            .includes(user._id);
    };

    const getLastMessageTimeStamp = (userId) => {
        const chat = allChats.find(chat =>
            chat.members
                .map(m => m._id)
                .includes(userId)
        );

        if (!chat?.lastMessage) return "";

        return moment(chat.lastMessage.createdAt).format("hh:mm A");
    };

    const getLastMessage = (userId) => {
        const chat = allChats.find(chat =>
            chat.members
                .map(m => m._id)
                .includes(userId)
        );

        if (!chat?.lastMessage) return "";

        const prefix =
            chat.lastMessage.sender === currentUser._id
                ? "You: "
                : "";

        return prefix + (chat.lastMessage.text || "").substring(0, 25);
    };

    const formatName = (user) => {
        if (!user) return "";

        const fname =
            user.firstname?.charAt(0)?.toUpperCase() +
            user.firstname?.slice(1)?.toLowerCase();

        const lname =
            user.lastname?.charAt(0)?.toUpperCase() +
            user.lastname?.slice(1)?.toLowerCase();

        return `${fname || ""} ${lname || ""}`;
    };

    useEffect(() => {
        if (!socket) return;

        const handleMessageCount = (message) => {
            const selectedChat =
                store.getState().userReducer.selectedChat;

            const chats =
                store.getState().userReducer.allChats;

            let updatedChats = chats;

            if (selectedChat?._id !== message.chatId) {
                updatedChats = chats.map(chat => {
                    if (chat._id === message.chatId) {
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
                chat => chat._id === message.chatId
            );

            const otherChats = updatedChats.filter(
                chat => chat._id !== message.chatId
            );

            dispatch(
                setAllChats([
                    latestChat,
                    ...otherChats
                ])
            );
        };

        socket.on("set-message-count", handleMessageCount);

        return () => {
            socket.off("set-message-count", handleMessageCount);
        };
    }, [socket, dispatch]);

    const getUnreadMessageCount = (userId) => {
        const chat = allChats.find(chat =>
            chat.members
                .map(m => m._id)
                .includes(userId)
        );

        if (
            chat &&
            chat.unreadMessageCount &&
            chat.lastMessage?.sender !== currentUser._id
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

        return allUsers.filter(user =>
            user.firstname
                ?.toLowerCase()
                .includes(searchKey.toLowerCase()) ||
            user.lastname
                ?.toLowerCase()
                .includes(searchKey.toLowerCase())
        );
    };

    return getData().map(obj => {
        let user = obj;

        if (obj.members) {
            user = obj.members.find(
                m => m._id !== currentUser._id
            );
        }

        return (
            <div
                className="user-search-filter"
                onClick={() => openChat(user._id)}
                key={user._id}
            >
                <div
                    className={
                        isSelectedChat(user)
                            ? "selected-user"
                            : "filtered-user"
                    }
                >
                    <div className="filter-user-display">
                        {user.profilePic ? (
                            <img
                                src={user.profilePic}
                                alt="profile"
                                className="user-profile-image"
                                style={
                                    onlineUser.includes(user._id)
                                        ? {
                                              border:
                                                  "#82e0aa 3px solid"
                                          }
                                        : {}
                                }
                            />
                        ) : (
                            <div
                                className={
                                    isSelectedChat(user)
                                        ? "user-selected-avatar"
                                        : "user-default-avatar"
                                }
                                style={
                                    onlineUser.includes(user._id)
                                        ? {
                                              border:
                                                  "#82e0aa 3px solid"
                                          }
                                        : {}
                                }
                            >
                                {user.firstname?.charAt(0)}
                                {user.lastname?.charAt(0)}
                            </div>
                        )}

                        <div className="filter-user-details">
                            <div className="user-display-name">
                                {formatName(user)}
                            </div>
                            <div className="user-display-email">
                                {getLastMessage(user._id) ||
                                    user.email}
                            </div>
                        </div>

                        <div>
                            {getUnreadMessageCount(user._id)}
                            <div className="last-message-timestamp">
                                {getLastMessageTimeStamp(
                                    user._id
                                )}
                            </div>
                        </div>

                        {!allChats.find(chat =>
                            chat.members
                                .map(m => m._id)
                                .includes(user._id)
                        ) && (
                            <div className="user-start-chat">
                                <button
                                    className="user-start-chat-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startNewChat(user._id);
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
    });
}

export default UsersList;