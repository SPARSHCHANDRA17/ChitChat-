import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getLoggedUser, getAllUsers } from "./../apiCalls/users";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../redux/loaderSlice";
import toast from "react-hot-toast";
import { setAllUsers, setUser, setAllChats } from "../redux/usersSlice";
import { getAllChats } from "../apiCalls/chat";

function ProtectedRoute({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // ---------------- USER ----------------
    const getloggedInUser = useCallback(async () => {
        try {
            dispatch(showLoader());

            const response = await getLoggedUser();

            dispatch(hideLoader());

            if (response.success) {
                dispatch(setUser(response.data));
            } else {
                toast.error(response.message);
                navigate("/login");
            }
        } catch (error) {
            dispatch(hideLoader());
            navigate("/login");
        }
    }, [dispatch, navigate]);

    // ---------------- USERS ----------------
    const getAllUsersFromDb = useCallback(async () => {
        try {
            dispatch(showLoader());

            const response = await getAllUsers();

            dispatch(hideLoader());

            if (response.success) {
                dispatch(setAllUsers(response.data));
            } else {
                toast.error(response.message);
                navigate("/login");
            }
        } catch (error) {
            dispatch(hideLoader());
            navigate("/login");
        }
    }, [dispatch, navigate]);

    // ---------------- CHATS ----------------
    const getCurrentUserChats = useCallback(async () => {
        try {
            const response = await getAllChats();

            if (response.success) {
                dispatch(setAllChats(response.data));
            }
        } catch (error) {
            navigate("/login");
        }
    }, [dispatch, navigate]);

    // ---------------- EFFECT ----------------
    useEffect(() => {
        if (!localStorage.getItem("token")) {
            navigate("/login");
            return;
        }

        getloggedInUser();
        getAllUsersFromDb();
        getCurrentUserChats();
    }, [
        navigate,
        getloggedInUser,
        getAllUsersFromDb,
        getCurrentUserChats
    ]);

    return children;
}

export default ProtectedRoute;