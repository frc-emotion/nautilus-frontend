import React from "react";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useAuthorization } from "./Authorization";
import { Roles } from "@/src/Constants";

type HeaderButton = {
  component: () => React.ReactNode;
  requiredRoles: Roles[];
};

export const getHeaderOptions = (
  title: string,
  headerLeft?: HeaderButton,
  headerRight?: HeaderButton
): NativeStackNavigationOptions => {
  const { hasRole } = useAuthorization();

  return {
    headerTitleAlign: "center",
    title,
    headerLeft: headerLeft && hasRole(headerLeft.requiredRoles) ? headerLeft.component : undefined,
    headerRight: headerRight && hasRole(headerRight.requiredRoles) ? headerRight.component : undefined,
  };
};