import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

// struct
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

// Reusable component for multiple-choice questions
interface MultipleChoiceProps {
  question: string;
  options: string[];
  selectedOption: string;
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
      <Text>Scouting</Text>
      <Text>Match Information</Text>

      <TextInput
        style={styles.input}
        value={matchInfo.teamNumber.toString()} 
        onChangeText={(text) => handleInputChange('teamNumber', text)}
        placeholder="Team Number"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.matchNumber.toString()} 
        onChangeText={(text) => handleInputChange('matchNumber', text)}
        placeholder="Match Number"
      />

      <Text>Autonomous</Text>

      <TextInput
        style={styles.input}
        value={matchInfo.ampNotesauto.toString()} 
        onChangeText={(text) => handleInputChange('ampNotesauto', text)}
        placeholder="Amp Notes"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.speakerNotesauto.toString()} 
        onChangeText={(text) => handleInputChange('speakerNotesauto', text)}
        placeholder="Speaker Notes"
      />

      <MultipleChoice
        question="Left Alliance Area?"
        options={["Yes", "No"]}
        selectedOption={matchInfo.leftAllianceArea ? "Yes" : "No"} 
        onSelect={(option) => handleOptionSelect('leftAllianceArea', option)}
      />

      <Text>Teleop</Text>

      <TextInput
        style={styles.input}
        value={matchInfo.ampNotes.toString()} 
        onChangeText={(text) => handleInputChange('ampNotes', text)}
        placeholder="Amp Notes"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.speakerNotes.toString()} 
        onChangeText={(text) => handleInputChange('speakerNotes', text)}
        placeholder="Speaker Notes"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.speakerNotesamped.toString()} 
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
        value={matchInfo.trapNotes.toString()} 
        onChangeText={(text) => handleInputChange('trapNotes', text)}
        placeholder="Trap Notes"
      />

      <Text>Ranking Points</Text>

      <MultipleChoice
        question="Melody"
        options={["Yes", "No"]}
        selectedOption={matchInfo.melody ? "Yes" : "No"} 
        onSelect={(option) => handleOptionSelect('melody', option)}
      />

      <MultipleChoice
        question="Ensemble"
        options={["Yes", "No"]}
        selectedOption={matchInfo.ensemble ? "Yes" : "No"} 
        onSelect={(option) => handleOptionSelect('ensemble', option)}
      />

      <Text>Robot Info</Text>

      <MultipleChoice
        question="Defense Bot"
        options={["Yes", "No"]}
        selectedOption={matchInfo.defenseBot ? "Yes" : "No"} 
        onSelect={(option) => handleOptionSelect('defenseBot', option)}
      />

      <MultipleChoice
        question="Robot Broke Down"
        options={["Yes", "No"]}
        selectedOption={matchInfo.robotBrokeDown ? "Yes" : "No"} 
        onSelect={(option) => handleOptionSelect('robotBrokeDown', option)}
      />

      <Text>Results</Text>

      <TextInput
        style={styles.input}
        value={matchInfo.penaltyPoints.toString()} 
        onChangeText={(text) => handleInputChange('penaltyPoints', text)}
        placeholder="Penalty Points"
      />

      <TextInput
        style={styles.input}
        value={matchInfo.finalScore.toString()} 
        onChangeText={(text) => handleInputChange('finalScore', text)}
        placeholder="Final Score"
      />

      <MultipleChoice
        question="Won"
        options={["Yes", "No"]}
        selectedOption={matchInfo.won ? "Yes" : "No"} 
        onSelect={(option) => handleOptionSelect('won', option)}
      />

      <MultipleChoice
        question="Tied"
        options={["Yes", "No"]}
        selectedOption={matchInfo.tied ? "Yes" : "No"} 
        onSelect={(option) => handleOptionSelect('tied', option)}
      />

      <TextInput
        style={styles.input}
        value={matchInfo.comments} 
        onChangeText={(text) => handleInputChange('comments', text)}
        placeholder="Comments"
      />

      

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
    backgroundColor: '#add8e6', // indicate selection
  },
  optionText: {
    fontSize: 16,
  },
});

export default ScoutingScreen;
