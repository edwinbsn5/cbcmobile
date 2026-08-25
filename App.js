import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import mobileAds from "react-native-google-mobile-ads";
import { COLORS } from "./theme";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider, useNotifications } from "./context/NotificationContext";
import { InboxProvider, useInbox } from "./context/InboxContext";
import { VideoSoundProvider } from "./context/VideoSoundContext";
import { registerForPushNotificationsAsync, registerNotificationResponseHandler } from "./services/pushNotifications";
import { registerLocationAsync } from "./services/location";
import { navigationRef } from "./navigation/navigationRef";
import SideMenu from "./components/SideMenu";
import WelcomeScreen from "./screens/WelcomeScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import CheckEmailScreen from "./screens/CheckEmailScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import FeedScreen from "./screens/FeedScreen";
import ReelsScreen from "./screens/ReelsScreen";
import GroupsScreen from "./screens/GroupsScreen";
import GroupDetailScreen from "./screens/GroupDetailScreen";
import GroupVideoPlayerScreen from "./screens/GroupVideoPlayerScreen";
import PagesListScreen from "./screens/PagesListScreen";
import PageDetailScreen from "./screens/PageDetailScreen";
import CreatePageScreen from "./screens/CreatePageScreen";
import PageTeamManagementScreen from "./screens/PageTeamManagementScreen";
import PageVideoPlayerScreen from "./screens/PageVideoPlayerScreen";
import BoostPageScreen from "./screens/BoostPageScreen";
import MyBoostedPagesScreen from "./screens/MyBoostedPagesScreen";
import MyAdsBoardScreen from "./screens/MyAdsBoardScreen";
import AGirlsMarketScreen from "./screens/AGirlsMarketScreen";
import CreateMarketProductScreen from "./screens/CreateMarketProductScreen";
import MyMarketProductsScreen from "./screens/MyMarketProductsScreen";
import EditMarketProductScreen from "./screens/EditMarketProductScreen";
import SavedMarketProductsScreen from "./screens/SavedMarketProductsScreen";
import MarketProductDetailScreen from "./screens/MarketProductDetailScreen";
import MarketCategoryChooserScreen from "./screens/MarketCategoryChooserScreen";
import MarketSwipeScreen from "./screens/MarketSwipeScreen";
import MarketVideoFeedScreen from "./screens/MarketVideoFeedScreen";
import MarketBoostProductScreen from "./screens/MarketBoostProductScreen";
import HashtagFeedScreen from "./screens/HashtagFeedScreen";
import TrendingHashtagsScreen from "./screens/TrendingHashtagsScreen";
import FeedVideoFullscreenScreen from "./screens/FeedVideoFullscreenScreen";
import CreateGroupScreen from "./screens/CreateGroupScreen";
import ChamaScreen from "./screens/ChamaScreen";
import CreateChamaScreen from "./screens/CreateChamaScreen";
import ChamaDetailScreen from "./screens/ChamaDetailScreen";
import ChamaAdminScreen from "./screens/ChamaAdminScreen";
import ProjectsScreen from "./screens/ProjectsScreen";
import CreateProjectScreen from "./screens/CreateProjectScreen";
import ProjectDetailScreen from "./screens/ProjectDetailScreen";
import ProjectAdminScreen from "./screens/ProjectAdminScreen";
import KYCScreen from "./screens/KYCScreen";
import GuarantorsScreen from "./screens/GuarantorsScreen";
import WallOfShameScreen from "./screens/WallOfShameScreen";
import MyFraudReportsScreen from "./screens/MyFraudReportsScreen";
import BoostPostScreen from "./screens/BoostPostScreen";
import MySponsoredPostsScreen from "./screens/MySponsoredPostsScreen";
import BoostGroupScreen from "./screens/BoostGroupScreen";
import MyBoostedGroupsScreen from "./screens/MyBoostedGroupsScreen";
import MyBoostedMarketProductsScreen from "./screens/MyBoostedMarketProductsScreen";
import SavedScreen from "./screens/SavedScreen";
import InfluencerQuestScreen from "./screens/InfluencerQuestScreen";
import ReportImposterScreen from "./screens/ReportImposterScreen";
import WalletScreen from "./screens/WalletScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AccountSettingsScreen from "./screens/AccountSettingsScreen";
import PrivacySettingsScreen from "./screens/PrivacySettingsScreen";
import WalletSettingsScreen from "./screens/WalletSettingsScreen";
import EventsScreen from "./screens/EventsScreen";
import EventDetailScreen from "./screens/EventDetailScreen";
import CreateEventScreen from "./screens/CreateEventScreen";
import InboxScreen from "./screens/InboxScreen";
import NewMessageScreen from "./screens/NewMessageScreen";
import ChatScreen from "./screens/ChatScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import FollowListScreen from "./screens/FollowListScreen";
import SearchScreen from "./screens/SearchScreen";
import OnboardingProfileScreen from "./screens/OnboardingProfileScreen";
import OnboardingFollowScreen from "./screens/OnboardingFollowScreen";
import CreatePostScreen from "./screens/CreatePostScreen";
import ReshareComposerScreen from "./screens/ReshareComposerScreen";
import CreateStoryScreen from "./screens/CreateStoryScreen";
import StoryViewerScreen from "./screens/StoryViewerScreen";
import AvatarViewerScreen from "./screens/AvatarViewerScreen";
import StoryInsightsScreen from "./screens/StoryInsightsScreen";
import EditPostScreen from "./screens/EditPostScreen";
import ReportPostScreen from "./screens/ReportPostScreen";
import BlockedUsersScreen from "./screens/BlockedUsersScreen";
import SupportScreen from "./screens/SupportScreen";
import NewTicketScreen from "./screens/NewTicketScreen";
import TicketDetailScreen from "./screens/TicketDetailScreen";
import ChildSafetyScreen from "./screens/ChildSafetyScreen";

const AuthStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="CheckEmail" component={CheckEmailScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Shown for a logged-in user whose onboardingCompletedAt is still null —
// re-evaluated on every app launch via Gate(), not just right after
// registering, so closing the app mid-onboarding correctly resumes here
// next time instead of leaking into the main app.
function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
      <OnboardingStack.Screen name="OnboardingFollow" component={OnboardingFollowScreen} />
    </OnboardingStack.Navigator>
  );
}

function NotificationBell({ navigation }) {
  const { unreadCount } = useNotifications();
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ marginRight: 16 }}>
      <Ionicons name="notifications-outline" size={24} color={COLORS.accent} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function InboxBell({ navigation }) {
  const { counts } = useInbox();
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Inbox")} style={{ marginRight: 16 }}>
      <Ionicons name="chatbubble-outline" size={24} color={COLORS.accent} />
      {counts.total > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{counts.total > 9 ? "9+" : counts.total}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Order matches the app's header spec: notifications, inbox, search.
function HeaderIcons({ navigation }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
      <NotificationBell navigation={navigation} />
      <InboxBell navigation={navigation} />
      <TouchableOpacity onPress={() => navigation.navigate("Search")}>
        <Ionicons name="search-outline" size={24} color={COLORS.accent} />
      </TouchableOpacity>
    </View>
  );
}

function Wordmark() {
  return <Text style={styles.wordmark}>TUJIJENGE</Text>;
}

function MainTabs({ navigation }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs.Navigator
        screenOptions={{
          headerTitleAlign: "left",
          headerTitle: () => <Wordmark />,
          headerRight: () => <HeaderIcons navigation={navigation} />,
          headerStyle: { backgroundColor: COLORS.accentInk },
          // Explicit height overrides react-navigation's own safe-area-aware
          // default, so the device's gesture/button nav bar inset has to be
          // added back in by hand here — otherwise it overlaps the system
          // nav bar on any phone with an inset (this regressed once before
          // when height was first hardcoded without it).
          tabBarStyle: { backgroundColor: COLORS.accentInk, height: 64 + insets.bottom, paddingTop: 6, paddingBottom: 8 + insets.bottom },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.wash,
        }}
      >
        <Tabs.Screen
          name="Home"
          component={FeedScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="ChamaTab"
          component={FeedScreen}
          options={{
            tabBarLabel: "Chama & Savings",
            tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("ChamaHome");
            },
          }}
        />
        <Tabs.Screen
          name="CreateTab"
          component={FeedScreen}
          options={{
            tabBarLabel: "Create",
            tabBarIcon: () => (
              <View style={styles.createTabIcon}>
                <Ionicons name="add" size={24} color={COLORS.accentInk} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("CreatePost");
            },
          }}
        />
        <Tabs.Screen
          name="ProjectsTab"
          component={FeedScreen}
          options={{
            tabBarLabel: "Investments & Projects",
            tabBarIcon: ({ color, size }) => <Ionicons name="rocket-outline" size={size} color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("ProjectsHome");
            },
          }}
        />
        <Tabs.Screen
          name="MenuTab"
          component={FeedScreen}
          options={{
            tabBarLabel: "Menu",
            tabBarIcon: ({ color, size }) => <Ionicons name="menu" size={size} color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setMenuOpen(true);
            },
          }}
        />
      </Tabs.Navigator>
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} navigation={navigation} />
    </>
  );
}

function RootNavigator() {
  useEffect(() => {
    registerForPushNotificationsAsync();
    registerLocationAsync();
    // Explicit init (rather than letting the SDK lazily self-init on the
    // first ad request) so the mobile ads SDK is already warm by the time
    // FeedScreen's first AdMobBanner/ReelsScreen's interstitial actually
    // asks for an ad.
    mobileAds().initialize();
    const subscription = registerNotificationResponseHandler(navigationRef);
    return () => subscription.remove();
  }, []);

  return (
    <NotificationProvider>
      <InboxProvider>
      <VideoSoundProvider>
      <StatusBar style="light" />
      <RootStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.accentInk },
          headerTintColor: "#fff",
          headerTitleStyle: { color: "#fff" },
        }}
      >
        <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: "Create Post", presentation: "modal" }} />
        <RootStack.Screen name="Groups" component={GroupsScreen} options={{ title: "Groups" }} />
        <RootStack.Screen name="Wallet" component={WalletScreen} options={{ title: "My Wallet" }} />
        <RootStack.Screen name="Reels" component={ReelsScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
        <RootStack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: "Group" }} />
        <RootStack.Screen name="GroupVideoPlayer" component={GroupVideoPlayerScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Pages" component={PagesListScreen} options={{ title: "Pages" }} />
        <RootStack.Screen name="PageDetail" component={PageDetailScreen} options={{ title: "Page" }} />
        <RootStack.Screen name="CreatePage" component={CreatePageScreen} options={{ title: "Create Page" }} />
        <RootStack.Screen name="PageTeamManagement" component={PageTeamManagementScreen} options={{ title: "Manage Team" }} />
        <RootStack.Screen name="PageVideoPlayer" component={PageVideoPlayerScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="BoostPage" component={BoostPageScreen} options={{ title: "Boost Page" }} />
        <RootStack.Screen name="MyBoostedPages" component={MyBoostedPagesScreen} options={{ title: "My Boosted Pages" }} />
        <RootStack.Screen name="MyAdsBoard" component={MyAdsBoardScreen} options={{ title: "My Ads Board" }} />
        <RootStack.Screen name="AGirlsMarket" component={AGirlsMarketScreen} options={{ title: "A Girls Market" }} />
        <RootStack.Screen name="CreateMarketProduct" component={CreateMarketProductScreen} options={{ title: "Create Product" }} />
        <RootStack.Screen name="MyMarketProducts" component={MyMarketProductsScreen} options={{ title: "My Products" }} />
        <RootStack.Screen name="EditMarketProduct" component={EditMarketProductScreen} options={{ title: "Edit Product" }} />
        <RootStack.Screen name="SavedMarketProducts" component={SavedMarketProductsScreen} options={{ title: "Saved Products" }} />
        <RootStack.Screen name="MarketProductDetail" component={MarketProductDetailScreen} options={{ title: "Product" }} />
        <RootStack.Screen name="MarketCategoryChooser" component={MarketCategoryChooserScreen} options={{ title: "Browse" }} />
        <RootStack.Screen name="MarketSwipe" component={MarketSwipeScreen} options={{ title: "Browse" }} />
        <RootStack.Screen name="MarketVideoFeed" component={MarketVideoFeedScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="MarketBoostProduct" component={MarketBoostProductScreen} options={{ title: "Boost Listing" }} />
        <RootStack.Screen name="MyBoostedMarketProducts" component={MyBoostedMarketProductsScreen} options={{ title: "My Boosted Products" }} />
        <RootStack.Screen name="HashtagFeed" component={HashtagFeedScreen} options={({ route }) => ({ title: `#${route.params.tag}` })} />
        <RootStack.Screen name="TrendingHashtags" component={TrendingHashtagsScreen} options={{ title: "Trending" }} />
        <RootStack.Screen name="FeedVideoFullscreen" component={FeedVideoFullscreenScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: "Create Group" }} />
        <RootStack.Screen name="ChamaHome" component={ChamaScreen} options={{ title: "Chama & Savings" }} />
        <RootStack.Screen name="CreateChama" component={CreateChamaScreen} options={{ title: "Create Chama" }} />
        <RootStack.Screen name="ChamaDetail" component={ChamaDetailScreen} options={{ title: "Chama" }} />
        <RootStack.Screen name="ChamaAdmin" component={ChamaAdminScreen} options={{ title: "Manage Chama" }} />
        <RootStack.Screen name="ProjectsHome" component={ProjectsScreen} options={{ title: "Investments & Projects" }} />
        <RootStack.Screen name="CreateProject" component={CreateProjectScreen} options={{ title: "Create Project" }} />
        <RootStack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: "Project" }} />
        <RootStack.Screen name="ProjectAdmin" component={ProjectAdminScreen} options={{ title: "Manage Project" }} />
        <RootStack.Screen name="KYC" component={KYCScreen} options={{ title: "Verify My Identity" }} />
        <RootStack.Screen name="Guarantors" component={GuarantorsScreen} options={{ title: "My Guarantors" }} />
        <RootStack.Screen name="WallOfShame" component={WallOfShameScreen} options={{ title: "Wall of Shame" }} />
        <RootStack.Screen name="MyFraudReports" component={MyFraudReportsScreen} options={{ title: "Fraud Reports Against Me" }} />
        <RootStack.Screen name="BoostPost" component={BoostPostScreen} options={{ title: "Boost Post" }} />
        <RootStack.Screen name="MySponsoredPosts" component={MySponsoredPostsScreen} options={{ title: "My Sponsored Posts" }} />
        <RootStack.Screen name="BoostGroup" component={BoostGroupScreen} options={{ title: "Boost Group" }} />
        <RootStack.Screen name="MyBoostedGroups" component={MyBoostedGroupsScreen} options={{ title: "My Boosted Groups" }} />
        <RootStack.Screen name="Saved" component={SavedScreen} options={{ title: "Saved" }} />
        <RootStack.Screen name="InfluencerQuest" component={InfluencerQuestScreen} options={{ title: "Influencer Quest" }} />
        <RootStack.Screen name="ReportImposter" component={ReportImposterScreen} options={{ title: "Report Imposter" }} />
        <RootStack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ title: "Account Settings" }} />
        <RootStack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ title: "Privacy" }} />
        <RootStack.Screen name="WalletSettings" component={WalletSettingsScreen} options={{ title: "Wallet Settings" }} />
        <RootStack.Screen name="Events" component={EventsScreen} options={{ title: "Events" }} />
        <RootStack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: "Event" }} />
        <RootStack.Screen name="CreateEvent" component={CreateEventScreen} options={{ title: "Create Event" }} />
        <RootStack.Screen name="Inbox" component={InboxScreen} options={{ title: "Inbox" }} />
        <RootStack.Screen name="NewMessage" component={NewMessageScreen} options={{ title: "New Message" }} />
        <RootStack.Screen name="Chat" component={ChatScreen} />
        <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
        <RootStack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: "Profile" }} />
        <RootStack.Screen name="FollowList" component={FollowListScreen} />
        <RootStack.Screen name="Search" component={SearchScreen} options={{ title: "Search" }} />
        <RootStack.Screen name="ReshareComposer" component={ReshareComposerScreen} options={{ title: "Reshare" }} />
        <RootStack.Screen name="CreateStory" component={CreateStoryScreen} options={{ title: "New Story", presentation: "modal" }} />
        <RootStack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <RootStack.Screen name="AvatarViewer" component={AvatarViewerScreen} options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <RootStack.Screen name="StoryInsights" component={StoryInsightsScreen} options={{ title: "Story Insights" }} />
        <RootStack.Screen name="EditPost" component={EditPostScreen} options={{ title: "Edit Post", presentation: "modal" }} />
        <RootStack.Screen name="ReportPost" component={ReportPostScreen} options={{ title: "Report Post", presentation: "modal" }} />
        <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: "Blocked Users" }} />
        <RootStack.Screen name="Support" component={SupportScreen} options={{ title: "Support" }} />
        <RootStack.Screen name="NewTicket" component={NewTicketScreen} options={{ title: "New Ticket" }} />
        <RootStack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: "Ticket" }} />
        <RootStack.Screen name="ChildSafety" component={ChildSafetyScreen} options={{ title: "Child Safety" }} />
      </RootStack.Navigator>
      </VideoSoundProvider>
      </InboxProvider>
    </NotificationProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }
  if (!user) return <AuthNavigator />;
  if (!user.onboardingCompletedAt) return <OnboardingNavigator />;
  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          <Gate />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute", top: -4, right: -6, backgroundColor: "#D32F2F", borderRadius: 9,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  wordmark: { fontSize: 19, fontWeight: "800", color: COLORS.accent, marginLeft: 16 },
  createTabIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent,
    alignItems: "center", justifyContent: "center", marginTop: -14,
    shadowColor: COLORS.accent, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});
