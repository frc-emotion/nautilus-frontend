import React from "react";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";

import { useModal } from "../utils/UI/CustomModalProvider";
import { ModalConfig } from "../Constants";
import { Box } from "@/components/ui/box";
import {
  AlertCircleIcon,
  CloseCircleIcon,
  HelpCircleIcon,
  Icon,
  InfoIcon,
  CheckCircleIcon,
} from "@/components/ui/icon";
import { ScrollView } from "react-native";

const GlobalModal: React.FC = () => {
  const { isOpen, config, closeModal } = useModal();

  if (!config) return null;

  const getTheme = (type: ModalConfig["type"]) => {
    switch (type) {
      case "success":
        return { icon: CheckCircleIcon, color: "green" };
      case "error":
        return { icon: CloseCircleIcon, color: "red" };
      case "warning":
        return { icon: AlertCircleIcon, color: "red" };
      case "info":
        return { icon: InfoIcon, color: "blue" };
      default:
        return { icon: HelpCircleIcon, color: "gray" };
    }
  };

  const { icon, color } = getTheme(config.type);

  return (
    <Modal isOpen={isOpen} onClose={closeModal} size="md">
      <ModalBackdrop />
      <ModalContent className="w-[90%] max-w-[400px] rounded-xl p-6 shadow-lg max-h-[85%]">
        <ScrollView contentContainerStyle={{ alignItems: "center" }}>
          <ModalHeader>
            <Box
              className={`w-14 h-14 rounded-full flex items-center justify-center`}
              style={{ backgroundColor: color }}
            >
              <Icon
                as={icon}
                size="xl"
                color="white"
              />
            </Box>
          </ModalHeader>

          <ModalBody>
            <Heading size="lg" className="font-semibold text-center">
              {config.title}
            </Heading>
            <Text size="sm" className="text-center mt-2">
              {config.message}
            </Text>
          </ModalBody>
        </ScrollView>
        <ModalFooter>
          <Button
            variant="solid"
            className="w-full rounded-lg py-2"
            onPress={closeModal}
          >
            <ButtonText>Close</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GlobalModal;