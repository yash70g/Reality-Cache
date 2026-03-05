import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import BrowserScreen from '../screens/BrowserScreen';
import CacheScreen from '../screens/CacheScreen';
import PeersScreen from '../screens/PeersScreen';
import ViewerScreen from '../screens/ViewerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CacheStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="CacheList" component={CacheScreen} />
            <Stack.Screen name="Viewer" component={ViewerScreen} />
        </Stack.Navigator>
    );
}

function TabIcon({ label, focused }) {
    const icons = { Home: '◈', Browser: '🌐', Cache: '📦', Peers: '📡' };
    return (
        <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
            {icons[label] || '•'}
        </Text>
    );
}

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
                    tabBarStyle: {
                        backgroundColor: '#0d0d2b',
                        borderTopColor: '#1a1a3e',
                        borderTopWidth: 1,
                        height: 60,
                        paddingBottom: 8,
                    },
                    tabBarActiveTintColor: '#7c5cfc',
                    tabBarInactiveTintColor: '#555',
                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: '600',
                    },
                })}
            >
                <Tab.Screen name="Home" component={HomeScreen} />
                <Tab.Screen name="Browser" component={BrowserScreen} />
                <Tab.Screen name="Cache" component={CacheStack} />
                <Tab.Screen name="Peers" component={PeersScreen} />
            </Tab.Navigator>
        </NavigationContainer>
    );
}
