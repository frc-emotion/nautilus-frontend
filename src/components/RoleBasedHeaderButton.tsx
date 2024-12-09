import React from "react";
import { Roles } from "../Constants";
import { useAuthorization } from "../navigation/utils/Authorization";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

interface RoleBasedHeaderButtonProps {
  onPress: () => void;
  title: string;
  requiredRoles: Roles[];
  style ?: any;
}

const RoleBasedHeaderButton: React.FC<RoleBasedHeaderButtonProps> = ({ onPress, title, requiredRoles, style }) => {
  const { hasRole } = useAuthorization();

  if (!hasRole(requiredRoles)) {
    return null;
  }

  return (
    <Pressable onPress={onPress} style={style}>
      <Text>{title}</Text>
    </Pressable>
  );
};

export default RoleBasedHeaderButton;