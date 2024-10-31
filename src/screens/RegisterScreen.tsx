import React from 'react';
//import { Button, XGroup, XStack, YStack } from 'tamagui'
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
//   <TouchableOpacity style={styles.binstyle} onPress={()=>setshowlist(!showlist)}>
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
  const [hidepassword, changepassword] = useState(true);
  const [showlist, setShowlist] = useState(false); // subteam dropdown
  const[selecteditem, itemselect] = useState<itemdata |null>(null)// subteam dropdown
  const [listdata, setlistdata] = useState([// subteam dropdown
    {id:1, label: 'Build',},
    {id:2, label:'Software',},
    {id:3, label:'Marketing',},
    {id:4, label:'Electrical',},
    {id:5, label:'Design'}
  ] )


  const [showlist1, setShowlist1] = useState(false);// grade dropdown
  const[selecteditem1, itemselect1] = useState<itemdata |null>(null)// grade dropdown
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

        {/* <Text style={styles.Label}>Grade</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Enter Grade" keyboardType='numeric' /> */}

        <Text style={styles.Label}>Email</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Enter Email" keyboardType='email-address'/>

        <Text style={styles.Label}>Phone Number</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Enter Phone Number" keyboardType='phone-pad' />

        <Text style={styles.Label}>School Student ID</Text>
        <TextInput style={styles.Input} placeholderTextColor={styles.placeholder.color} placeholder="Enter StudentID" keyboardType='numeric' />

        <TouchableOpacity style={styles.dropdown} onPress={() => setShowlist1(!showlist1)}>
          <Text style={[styles.Label,{marginLeft:0,}]}>{selecteditem1?.label ? selecteditem1.label: 'Grade'}</Text> 
        </TouchableOpacity>
        {gradedata && (
          <View>
            {listdata.map((item,index) =>{
              return(
                <TouchableOpacity  style={styles.dropdownitem} key={index} onPress={()=> itemselect1(item)}>           
                  <Text style={[styles.Label, {marginLeft: 0,}]}>{item.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
        <Text style={styles.Label}>Subteam</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowlist(!showlist)}>
          <Text style={[{marginLeft:0, color:'black'}]}>{selecteditem?.label ? selecteditem.label: 'Select'}</Text>
        </TouchableOpacity>
        {showlist && (
          <View>
            {listdata.map((item,index) =>{
              return(
                <TouchableOpacity  style={styles.dropdownitem} key={index} onPress={()=> itemselect(item)}>
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
    marginLeft: 16,
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
