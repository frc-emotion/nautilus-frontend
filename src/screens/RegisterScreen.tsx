import React from 'react';
import { XGroup, XStack, YStack, Circle } from 'tamagui'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, ViewComponent,Button } from 'react-native';
import { useState } from 'react';

// interface DropdownProps {
//   Title: string;
//   options: string[]
//   selectedOption: string | null;
//   onSelect: (option: string) => void;
// }

// const Dropdown: React.FC<DropdownProps> = ({ Title,options,selectedOption,onSelect }) => (
//   <SafeAreaView>
//   <TouchableOpacity style={styles.binstyle} onPress={()=>setshowlist(!subteamlist)}>
//     <Text style={styles.Label}>{Title}</Text>
//   </TouchableOpacity>
//   {showlist && (
//     <View>
//       <Text style={styles.Label}>{options[0]}</Text>
//       <Text style={styles.Label}>{options[1]}</Text>
//       <Text style={styles.Label}>{options[2]}</Text>
//       <Text style={styles.Label}>{options[3]}</Text>
//       <Text style={styles.Label}>{options[4]}</Text>
//     </View>
//   )}
// </SafeAreaView>
// );


interface itemdata{
  label?: string,
  id?:number
}
const HomeScreen: React.FC = () => {
  // Define state and variables at the top
  //const [hidepassword, changepassword] = useState(true);

  const [subteamlist, showteamlist] = useState(false); // subteam dropdown
  const[selectedteam, teamselect] = useState<itemdata |null>(null)// subteam dropdown
  const [subteamdata, setteamdata] = useState([// subteam dropdown
    {id:1, label: 'Build',},
    {id:2, label:'Software',},
    {id:3, label:'Marketing',},
    {id:4, label:'Electrical',},
    {id:5, label:'Design'}
  ] )


  const [gradelist, showgradelist] = useState(false);// grade dropdown
  const[selectedgrade, gradeselect] = useState<itemdata |null>(null)// grade dropdown
  const [gradedata,setgradedata] = useState([// grade dropdown
    {id:1, label: '9',},
    {id:2, label:'10',},
    {id:3, label:'11',},
    {id:4, label:'12',},
  ])
  
  
  return (
    <ScrollView>
      <SafeAreaView style={styles.container}>
        <Text style={styles.Title}>Create New Account</Text>

        <Text style={styles.Label}>Full Name</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Enter Name" autoCapitalize="words"/>

        <Text style={styles.Label}>Email</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Enter Email" keyboardType='email-address'/>

        <Text style={styles.Label}>Phone Number</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Enter Phone Number" keyboardType='phone-pad' />

        <Text style={styles.Label}>School Student ID</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Enter StudentID" keyboardType='numeric' />

        <Text style={styles.Label}>Grade</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => showgradelist(!gradelist)}>
          <Text style={[{marginLeft:0, color:'black'}]}>{selectedgrade?.label ? selectedgrade.label: 'Select'}</Text>
        </TouchableOpacity>
        {gradelist && (
          <View>
            {gradedata.map((item,index) =>{
              return(
                <TouchableOpacity  style={styles.dropdownitem} key={index} onPress={()=> gradeselect(item)}>
                  <Text style={[styles.Label, {marginLeft: 0,}]}>{item.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}


        <Text style={[styles.Label,{marginTop:16,}]}>Subteam</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => showteamlist(!subteamlist)}>
          <Text style={[{marginLeft:0, color:'black'}]}>{selectedteam?.label ? selectedteam.label: 'Select'}</Text>
        </TouchableOpacity>
        {subteamlist && (
          <View>
            {subteamdata.map((item,index) =>{
              return(
                <TouchableOpacity  style={styles.dropdownitem} key={index} onPress={()=> teamselect(item)}>
                  <Text style={[styles.Label, {marginLeft: 0,}]}>{item.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <Text style={[styles.Label,{marginTop:16,}]}>Password</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Choose Password" secureTextEntry={true} />

        <Text style={styles.Label}>Confirm Password</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Confirm Password" secureTextEntry={true} />

        <TouchableOpacity style={styles.button} onPress={() => console.log("Button pressed")}>
          <Text style={[styles.Label,{color:'black'},{marginLeft: 0}]}>Create Account</Text>
        </TouchableOpacity>

        
        {/* <Circle size={100} backgroundColor="$color" elevation="$4" /> */}

      </SafeAreaView>
    </ScrollView>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    flexDirection: "column",
    alignItems: 'center',
  },
  Label:{
    color: 'black',
    marginLeft: 16,
    fontSize: 16,
    marginBottom:6,
    alignItems: 'flex-start',
  },
  Input:{
    color: 'black',
    fontSize: 16,
    height: 50,
    width: 250,
    borderColor: 'gray',
    borderWidth: 2,
    borderRadius: 15,
    padding: 8,
    marginBottom: 16,
    marginLeft: 0,
    alignItems: 'flex-start',
  },
  Title:{
    color: 'black',
    marginBottom: 16,
    marginLeft: 16,
    fontSize: 32,
  },
  button:{
    backgroundColor: 'yellow', // Button background color
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 120,
    marginLeft: 16,
  },
  binstyle:{
    borderWidth: 1,
    width: 2,
  },
  dropdown:{
    backgroundColor: 'white', // Dropown background color
    borderColor: 'gray',
    paddingVertical: 10,
    paddingHorizontal: 60,
    borderWidth: 2,
    width: 250,
    borderRadius: 15,
    marginLeft: 0,
    marginBottom: 0,
  },
  placeholder:{
    color:'gray',
  },
  dropdownitem:{
    borderColor:'gray',
    paddingVertical: 10,
    paddingHorizontal: 50,
    borderBottomWidth:2,
    borderLeftWidth:2,
    borderRightWidth:2,
    width: 200,
    marginLeft: 0,
    alignItems: 'center',
    

  }

});

export default HomeScreen;

function state(arg0: boolean): [any, any] {
    throw new Error('Function not implemented.');
}
