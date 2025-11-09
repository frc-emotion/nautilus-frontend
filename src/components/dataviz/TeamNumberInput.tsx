/**
 * Team Number input component
 */
import React from 'react';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Input, InputField } from '@/components/ui/input';

type TeamNumberInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
};

export function TeamNumberInput({ value, onChangeText, error }: TeamNumberInputProps) {
  return (
    <VStack className="w-full">
      <Text className="mb-1 font-medium text-sm">Team Number</Text>
      <Input size="md" variant="outline" className={error ? 'border-red-500' : ''}>
        <InputField
          placeholder="254"
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          autoCorrect={false}
        />
      </Input>
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </VStack>
  );
}
