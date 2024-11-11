import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import ApiClient, { QueuedRequest } from '../utils/APIClient';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Divider } from '@/components/ui/divider';
import { Button } from '@/components/ui/button';

const FailedRequestsScreen = () => {
  const [failedRequests, setFailedRequests] = useState<QueuedRequest[]>([]);

  useEffect(() => {
    loadFailedRequests();
  }, []);

  const loadFailedRequests = async () => {
    const requests = await ApiClient.getFailedRequests();
    setFailedRequests(requests);
  };

  const retryRequest = async (request: QueuedRequest) => {
    await ApiClient.retryFailedRequest(request);
    loadFailedRequests();
  };

  const clearAllFailedRequests = async () => {
    await ApiClient.clearFailedRequest();
    setFailedRequests([]);
  };

  return (
    <VStack className="flex-1 p-4 bg-gray-50">
      <Text className="text-xl font-bold text-center mb-4">Failed Requests</Text>
      <FlatList
        data={failedRequests}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        renderItem={({ item }) => (
          <Box className="p-4 mb-3 bg-white rounded-lg shadow-sm border border-gray-200">
            <VStack space="xs">
              <HStack className="justify-between">
                <Text className="font-semibold">Method:</Text>
                <Text>{item.method.toUpperCase()}</Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="font-semibold">URL:</Text>
                <Text className="text-gray-500">{item.url}</Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="font-semibold">Data:</Text>
                <Text className="text-gray-500">{JSON.stringify(item.data)}</Text>
              </HStack>
              <Divider />
              <Button
                onPress={() => retryRequest(item)}
                className="mt-2 bg-blue-600 rounded-full"
              >
                Retry
              </Button>
            </VStack>
          </Box>
        )}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 mt-4">No failed requests</Text>
        }
      />
      {failedRequests.length > 0 && (
        <Button
          onPress={clearAllFailedRequests}
          className="mt-6 bg-red-500 rounded-full self-center w-3/4"
        >
          Clear All Failed Requests
        </Button>
      )}
    </VStack>
  );
};

export default FailedRequestsScreen;