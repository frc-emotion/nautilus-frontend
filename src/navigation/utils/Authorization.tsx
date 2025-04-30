import { roleHierarchy, Roles } from "@/src/Constants";
import { useAuth } from "@/src/utils/Context/AuthContext";

export const useAuthorization = () => {
  const { user } = useAuth();

  const hasRole = (requiredRoles: Roles[]): boolean => {
    if (!user) return false;
    const userRoles = roleHierarchy[user.role as Roles] || [];
    return requiredRoles.some(role => userRoles.includes(role));
  };

  return { hasRole };
};