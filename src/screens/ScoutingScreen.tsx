import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Radio, RadioGroup } from '@/components/ui/radio';

import { Text } from "@/components/ui/text";
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import {
    Select,
    SelectTrigger,
    SelectInput,
    SelectIcon,
    SelectPortal,
    SelectBackdrop,
    SelectContent,
    SelectItem
  } from '@/components/ui/select';
  import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter,
  } from "@/components/ui/alert-dialog";
  import { Toast, ToastTitle, useToast } from '@/components/ui/toast';
  import ApiClient from '../utils/APIClient';
  import { EyeIcon, EyeOffIcon, ChevronDownIcon } from 'lucide-react-native';
  import { AxiosError } from 'axios';

  interface MatchInfo {
    teamNumber: number;
    matchNumber: number;
  
    ampNotesauto: number;
    speakerNotesauto: number;
    leftAllianceArea: boolean; 
  
    ampNotes: number;
    speakerNotes: number;
    speakerNotesamped: number;
    
    parkedSpotlit: string;   
    harmony: string;  
    trapNotes: number;
  
    melody: boolean;
    ensemble: boolean;
  
    defenseBot: boolean;
    robotBrokeDown: boolean;
  
    penaltyPoints: number;
    finalScore: number;
    won: boolean;
    tied: boolean;
  
    comments: string;
  }
  

  const ScoutingScreen: React.FC = () => {
  // State for managing structured match information
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({
    teamNumber: 0, 
    matchNumber: 0, 

    ampNotesauto: 0, 
    speakerNotesauto: 0, 
    leftAllianceArea: false, 

    ampNotes: 0, 
    speakerNotes: 0, 
    speakerNotesamped: 0, 

    parkedSpotlit: '', 
    harmony: '', 
    trapNotes: 0, 

    melody: false, 
    ensemble: false, 

    defenseBot: false,
    robotBrokeDown: false, 

    penaltyPoints: 0, 
    finalScore: 0, 
    won: false, 
    tied: false,

    comments: '', 
  });

  // Data types Init --- needs tweaking ^

  
  const handleInputChange = (field: keyof MatchInfo, value: string) => {
    // convertsinon for string to int
    if (['teamNumber', 'matchNumber', 'ampNotesauto', 'speakerNotesauto', 'ampNotes', 'speakerNotes', 'speakerNotesamped', 'trapNotes', 'penaltyPoints', 'finalScore'].includes(field)) {
      const numberValue = parseFloat(value) || 0; // Convert to number
      setMatchInfo((prev) => ({ ...prev, [field]: numberValue }));
      console.log(`Field: ${field}, data type: number, answer: ${numberValue}`); // log input change -temp dev
    } else {
      setMatchInfo((prev) => ({ ...prev, [field]: value })); 
      console.log(`Field: ${field}, data type: string, answer: ${value}`); // log input change -temp dev
    }
  };

  const handleOptionSelect = (field: keyof MatchInfo, option: string) => {
    // conversion for yn mc to bool
    if (['leftAllianceArea', 'melody', 'ensemble', 'defenseBot', 'robotBrokeDown', 'won', 'tied'].includes(field)) {
      const boolValue = option === "Yes";
      setMatchInfo((prev) => ({ ...prev, [field]: boolValue }));
      console.log(`Field: ${field}, data type: boolean, answer: ${boolValue}`); // log input change -temp dev
    } else {
      setMatchInfo((prev) => ({ ...prev, [field]: option })); 
      console.log(`Field: ${field}, data type: string, answer: ${option}`); // log input change -temp dev
    }
  };


  // converting num to stright initally then converts BACK to num / bool and stored in var  ---- couldnt find a way to get a num as value
  // mc Should Directly innit as a string so no change 


  return (
    <ScrollView contentContainerStyle={header.container}>
      <VStack space="sm" className="max-w-[600px] w-full mx-auto p-3 bg-white rounded-md shadow">
      {/* <TextInput
        style={styles.input}
        value={matchInfo.teamNumber.toString()} 
        onChangeText={(text) => handleInputChange('teamNumber', text)}
        placeholder="Team Number"
      /> */}
      <Text className="mb-1 text-gray-600">Information</Text>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Team Number"
                value={matchInfo.teamNumber.toString()}
                onChangeText={(text: string) => handleInputChange('teamNumber', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Match Number"
                value={matchInfo.matchNumber.toString()}
                onChangeText={(text: string) => handleInputChange('matchNumber', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

    <Text className="mb-1 text-gray-600">Autonomus</Text>  

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Amp Notes"
                value={matchInfo.ampNotesauto.toString()}
                onChangeText={(text: string) => handleInputChange('ampNotesauto', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Speaker Notes"
                value={matchInfo.speakerNotesauto.toString()}
                onChangeText={(text: string) => handleInputChange('speakerNotesauto', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>
        
        <RadioGroup
        value={matchInfo.leftAllianceArea ? "Yes" : "No"}
        onChange={(value: string) => handleOptionSelect('leftAllianceArea', value)}
        >
            <VStack>
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
            </VStack>
        </RadioGroup>

        <Text className="mb-1 text-gray-600">Teleop</Text>    

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Amp Notes"
                value={matchInfo.ampNotes.toString()}
                onChangeText={(text: string) => handleInputChange('ampNotes', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Speaker Notes"
                value={matchInfo.speakerNotes.toString()}
                onChangeText={(text: string) => handleInputChange('speakerNotes', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Speaker Notes (Amplified)"
                value={matchInfo.speakerNotesamped.toString()}
                onChangeText={(text: string) => handleInputChange('speakerNotesamped', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

        <RadioGroup
        value={matchInfo.parkedSpotlit}
        onChange={(value: string) => handleOptionSelect('parkedSpotlit', value)}
        >
            <VStack>
                <Radio value="Not Parked">Not Parked</Radio>
                <Radio value="Parked">Parked</Radio>
                <Radio value="On Stage">On Stage</Radio>
                <Radio value="On Stage (Spotlight)">On Stage (Spotlight)</Radio>
            </VStack>
        </RadioGroup>

        <RadioGroup
        value={matchInfo.harmony}
        onChange={(value: string) => handleOptionSelect('harmony', value)}
        >
            <VStack>
                <Radio value="None">None</Radio>
                <Radio value="One Robot">One Robot</Radio>
                <Radio value="Two Robots">Two Robots</Radio>
                <Radio value="Three Robots">Three Robots</Radio>
            </VStack>
        </RadioGroup>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Trap Notes"
                value={matchInfo.trapNotes.toString()}
                onChangeText={(text: string) => handleInputChange('trapNotes', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

        <Text className="mb-1 text-gray-600">Ranking Points</Text> 

        <RadioGroup
        value={matchInfo.melody ? "Yes" : "No"}
        onChange={(value: string) => handleOptionSelect('melody', value)}
        >
            <VStack >
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
            </VStack>
        </RadioGroup>

        <RadioGroup
        value={matchInfo.ensemble ? "Yes" : "No"}
        onChange={(value: string) => handleOptionSelect('ensemble', value)}
        >
            <VStack >
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
            </VStack>
        </RadioGroup>

        <Text className="mb-1 text-gray-600">Robot Info</Text>

        <RadioGroup
        value={matchInfo.defenseBot ? "Yes" : "No"}
        onChange={(value: string) => handleOptionSelect('defenseBot', value)}
        >
            <VStack >
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
            </VStack>
        </RadioGroup>

        <RadioGroup
        value={matchInfo.robotBrokeDown ? "Yes" : "No"}
        onChange={(value: string) => handleOptionSelect('robotBrokeDown', value)}
        >
            <VStack >
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
            </VStack>
        </RadioGroup>

        <Text className="mb-1 text-gray-600">Results</Text>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Penalty Points"
                value={matchInfo.penaltyPoints.toString()}
                onChangeText={(text: string) => handleInputChange('penaltyPoints', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Final Score"
                value={matchInfo.finalScore.toString()}
                onChangeText={(text: string) => handleInputChange('finalScore', text)}
                autoCorrect={false}
                keyboardType="numeric"
              />
        </Input>

        <RadioGroup
        value={matchInfo.won ? "Yes" : "No"}
        onChange={(value: string) => handleOptionSelect('won', value)}
        >
            <VStack >
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
            </VStack>
        </RadioGroup>

        <RadioGroup
        value={matchInfo.tied ? "Yes" : "No"}
        onChange={(value: string) => handleOptionSelect('tied', value)}
        >
            <VStack>
                <Radio value="Yes">Yes</Radio>
                <Radio value="No">No</Radio>
            </VStack>
        </RadioGroup>

        <Input size="md" className="mb-1 mt-2 text-gray-600">
              <InputField
              className="rounded text-black-600"
                placeholder="Comments"
                value={matchInfo.comments.toString()}
                onChangeText={(text: string) => handleInputChange('comments', text)}
                autoCorrect={false}
              />
        </Input>

      </VStack>
    </ScrollView>
    //submit button at end?
  );
};

// Formatting
const header = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
});

// const styles = StyleSheet.create({
//   input: {
//     height: 50,
//     width: '80%',
//     borderColor: '#ccc',
//     borderWidth: 1,
//     borderRadius: 8,
//     paddingLeft: 10,
//     marginVertical: 15,
//   },
//   option: {
//     width: '80%',
//     padding: 15,
//     marginVertical: 5,
//     borderRadius: 5,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     alignItems: 'center',
//   },
//   selectedOption: {
//     backgroundColor: '#add8e6', // indicate selection
//   },
//   optionText: {
//     fontSize: 16,
//   },
// });

export default ScoutingScreen;