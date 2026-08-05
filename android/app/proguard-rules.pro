# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# expo-modules-core's own internal Kotlin-reflection type system
# (expo.modules.kotlin.types.*) reflectively invokes constructors to convert
# JS args to native module calls at runtime. Its shipped consumer proguard
# rules only cover user-facing APIs (Module/Record/SharedObject subclasses),
# not these internals, so plain minifyEnabled strips an overload R8 thinks
# is unused — crashing every launch with a NoSuchMethodError inside
# NativeModulesProxy's <init> before any JS even runs.
-keep class expo.modules.kotlin.** { *; }

# Add any project specific keep options here:
