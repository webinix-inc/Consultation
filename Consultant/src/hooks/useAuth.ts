// src/hooks/useAuth.ts
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout as logoutAction } from "@/features/auth/authSlice";
import type { RootState } from "@/app/store";

type UserType = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export const useAuth = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const logout = useCallback(() => {
    dispatch(logoutAction());
    navigate("/");
  }, [dispatch, navigate]);

  return {
    user,
    token,
    isAuthenticated,
    logout,
  };
};
