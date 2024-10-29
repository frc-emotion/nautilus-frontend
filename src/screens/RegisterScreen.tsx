import React from 'react';
//import { Button, XGroup, XStack, YStack } from 'tamagui'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity } from 'react-native';


const HomeScreen: React.FC = () => (
  <ScrollView style={{backgroundColor: 'white'}}>
  <View style={styles.container}>
    <Text style={styles.Title}>Create New Account</Text>

    <Text style={styles.Label}>Full Name</Text>
    <TextInput style={styles.Input} placeholder='Enter Name'></TextInput>

    <Text style={styles.Label}>Grade</Text>
    <TextInput style={styles.Input} placeholder='Enter Grade'></TextInput>

    <Text style={styles.Label}>Email</Text>
    <TextInput style={styles.Input} placeholder='Enter Email'></TextInput>

    <Text style={styles.Label}>Phone Number</Text>
    <TextInput style={styles.Input} placeholder='Enter Phone Number'></TextInput>

    <Text style={styles.Label}>School Student ID</Text>
    <TextInput style={styles.Input} placeholder='Enter StudentID'></TextInput>

    <Text style={styles.Label}>Sub-Team</Text> 
    <TextInput style={styles.Input} placeholder='Select Sub-team'></TextInput>

    <Text style={styles.Label}>Password</Text>
    <TextInput style={styles.Input} placeholder='Choose Password'></TextInput>

    <Text style={styles.Label}>Confirm Password</Text>
    <TextInput style={styles.Input} placeholder='Confirm Password'></TextInput>

    <TouchableOpacity style={styles.button} onPress={()=> console.log("button pressed")}>
        <Text style={styles.ButtonText}>Create Account</Text>
    </TouchableOpacity>

  </View>
  </ScrollView>
);



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    flexDirection: "column",
    alignItems: 'flex-start',
  },
  Label:{
    color: 'white',
    marginLeft: 16,
    fontSize: 24,
  },
  Input:{
    color: 'white',
    height: 40,
    width: 200,
    borderColor: 'yellow',
    borderWidth: 2,
    padding: 8,
    marginBottom: 16,
    marginLeft: 16,
  },
  Title:{
    color: 'white',
    marginBottom: 16,
    marginLeft: 16,
    fontSize: 60,
  },
  button:{
    backgroundColor: 'yellow', // Button background color
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginLeft: 16,
  },
  ButtonText:{
    color:'black',
  }
});

export default HomeScreen;