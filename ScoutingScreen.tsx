import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

// Define the structure for storing all match information MC uses Null
interface MatchInfo {
  teamNumber: string;
  matchNumber: string;

  ampNotesauto: string;
  speakerNotesauto: string;
  leftAllianceArea: string | null; 

  ampNotes: string;
  speakerNotes: string;
  speakerNotesamped: string;
  
  parkedSpotlit: string | null;   
  harmony: string | null;  
  trapNotes: string;

  melody: string | null;
  ensemble: string | null;

  defenseBot: string | null;
  robotBrokeDown: string | null;

  penaltyPoints: string;
  finalScore: string;
  won: string | null;
  tied: string | null;

  comments: string;
}

// Reusable component for multiple-choice questions
interface MultipleChoiceProps {
  question: string;
  options: string[];
  selectedOption: string | null;
  onSelect: (option: string) => void;
}

const MultipleChoice: React.FC<MultipleChoiceProps> = ({ question, options, selectedOption, onSelect }) => {
  return (
    <View>
      <Text>{question}</Text>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.option,
            selectedOption === option && styles.selectedOption
          ]}
          onPress={() => onSelect(option)}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const ScoutingScreen: React.FC = () => {
  // State for managing structured match information
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({
    teamNumber: '',
    matchNumber: '',

    ampNotesauto: '',
    speakerNotesauto: '',
    leftAllianceArea: null,

    ampNotes: '',
    speakerNotes: '',
    speakerNotesamped: '',

    parkedSpotlit: null,
    harmony: null,
    trapNotes: '',

    melody: null,
    ensemble: null,

    defenseBot: null,
    robotBrokeDown: null,

    penaltyPoints: '',
    finalScore: '',
    won: null,
    tied: null,

    comments: '',
  });

  // Handler for updating each field in the struct
  const handleInputChange = (field: keyof MatchInfo, value: string) => {
    setMatchInfo((prev) => ({ ...prev, [field]: value }));
  };

  // Handler for selecting an option for multiple-choice questions
  const handleOptionSelect = (field: keyof MatchInfo, option: string) => {
    setMatchInfo((prev) => ({ ...prev, [field]: option }));
  };

  return (
    <ScrollView contentContainerStyle={header.container}>
      <Text>Scouting</Text>
      <Text>Match Information</Text>

      <TextInput
        style={styles.input}
        value={matchInfo.teamNumber}
        onChangeText={(text) => handleInputChange('teamNumber', text)}
        placeholder="Team Number"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.matchNumber}
        onChangeText={(text) => handleInputChange('matchNumber', text)}
        placeholder="Match Number"
      />

      <Text>Autonomous</Text>

      <TextInput
        style={styles.input}
        value={matchInfo.ampNotesauto}
        onChangeText={(text) => handleInputChange('ampNotesauto', text)}
        placeholder="Amp Notes"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.speakerNotesauto}
        onChangeText={(text) => handleInputChange('speakerNotesauto', text)}
        placeholder="Speaker Notes"
      />

      <MultipleChoice
        question="Left Alliance Area?"
        options={["Yes", "No"]}
        selectedOption={matchInfo.leftAllianceArea}
        onSelect={(option) => handleOptionSelect('leftAllianceArea', option)}
      />

      <Text>Teleop</Text>

      <TextInput
        style={styles.input}
        value={matchInfo.ampNotes}
        onChangeText={(text) => handleInputChange('ampNotes', text)}
        placeholder="Amp Notes"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.speakerNotes}
        onChangeText={(text) => handleInputChange('speakerNotes', text)}
        placeholder="Speaker Notes"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.speakerNotesamped}
        onChangeText={(text) => handleInputChange('speakerNotesamped', text)}
        placeholder="Speaker Notes (Amplified)"
      />

      <MultipleChoice
        question="Parked / Spotlit?"
        options={["Not Parked", "Parked", "On Stage", "On Stage (Spotlit)"]}
        selectedOption={matchInfo.parkedSpotlit}
        onSelect={(option) => handleOptionSelect('parkedSpotlit', option)}
      />

      <MultipleChoice
        question="Harmony"
        options={["None", "One Robot", "Two Robots", "Three Robots"]}
        selectedOption={matchInfo.harmony}
        onSelect={(option) => handleOptionSelect('harmony', option)}
      />
      
      <TextInput
        style={styles.input}
        value={matchInfo.trapNotes}
        onChangeText={(text) => handleInputChange('trapNotes', text)}
        placeholder="Trap Notes"
      />

    <Text>Ranking Points</Text>

      <MultipleChoice
        question="Melody"
        options={["Yes", "No"]}
        selectedOption={matchInfo.melody}
        onSelect={(option) => handleOptionSelect('melody', option)}
      />

      <MultipleChoice
        question="Ensemble"
        options={["Yes", "No"]}
        selectedOption={matchInfo.ensemble}
        onSelect={(option) => handleOptionSelect('ensemble', option)}
      />

    <Text>Robot Info</Text>

      <MultipleChoice
        question="Defense Bot"
        options={["Yes", "No"]}
        selectedOption={matchInfo.defenseBot}
        onSelect={(option) => handleOptionSelect('defenseBot', option)}
      />

      <MultipleChoice
        question="Robot Broke Down"
        options={["Yes", "No"]}
        selectedOption={matchInfo.robotBrokeDown}
        onSelect={(option) => handleOptionSelect('robotBrokeDown', option)}
      />

    <Text>Results</Text>

      <TextInput
        style={styles.input}
        value={matchInfo.penaltyPoints}
        onChangeText={(text) => handleInputChange('penaltyPoints', text)}
        placeholder="Penalty Points"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.finalScore}
        onChangeText={(text) => handleInputChange('finalScore', text)}
        placeholder="Final Score"
      />

      <MultipleChoice
          question="Won"
          options={["Yes", "No"]}
          selectedOption={matchInfo.won}
          onSelect={(option) => handleOptionSelect('won', option)}
      />

      <MultipleChoice
          question="Tied"
          options={["Yes", "No"]}
          selectedOption={matchInfo.tied}
          onSelect={(option) => handleOptionSelect('tied', option)}
      />

      <TextInput
        style={styles.input}
        value={matchInfo.comments}
        onChangeText={(text) => handleInputChange('comments', text)}
        placeholder="Comments"
      />

    </ScrollView>
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

const styles = StyleSheet.create({
  input: {
    height: 50,
    width: '80%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    marginVertical: 15,
  },
  option: {
    width: '80%',
    padding: 15,
    marginVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#add8e6', // Light blue color to indicate selection
  },
  optionText: {
    fontSize: 16,
  },
});

export default ScoutingScreen;
