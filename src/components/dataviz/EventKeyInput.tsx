/**
 * TBA Event Key input component with validation
 */
import React from 'react';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Input, InputField } from '@/components/ui/input';

type EventKeyInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
};

export function EventKeyInput({ value, onChangeText, error }: EventKeyInputProps) {
  return (
    <VStack className="w-full">
      <Text className="mb-1 font-medium text-sm">TBA Event Key</Text>
      <Input size="md" variant="outline" className={error ? 'border-red-500' : ''}>
        <InputField
          placeholder="2024casd"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Input>
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </VStack>
  );
}
