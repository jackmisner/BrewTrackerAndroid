/**
 * Help & Support Screen
 *
 * Comprehensive help and support hub providing access to user guides,
 * FAQs, bug reporting, and feature requests. Integrates with GitHub
 * for issue tracking and external resources.
 *
 * Features:
 * - User guide sections with collapsible content
 * - FAQ with category filtering and expandable answers
 * - Bug report and feature request GitHub integration
 * - External links to repository and resources
 * - Search functionality for FAQs (future)
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(profile)/helpAndSupport');
 * ```
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@contexts/ThemeContext";
import { helpAndSupportStyles } from "@styles/modals/helpAndSupportStyles";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "general" | "brewing" | "technical" | "features";
}

const faqData: FAQItem[] = [
  // General Questions
  {
    id: "what-is-brewtracker",
    question: "What is BrewTracker?",
    answer:
      "BrewTracker is a comprehensive homebrewing management application that helps you create recipes, track brewing sessions, and analyze your brewing data. It includes automatic calculation of brewing metrics, AI-powered recipe optimization, and tools for sharing recipes with the brewing community.",
    category: "general",
  },
  {
    id: "is-brewtracker-free",
    question: "Is BrewTracker free to use?",
    answer:
      "Yes! BrewTracker is completely free and open-source. You can use all features without any cost, and the source code is available on GitHub for transparency and community contributions.",
    category: "general",
  },
  {
    id: "data-privacy",
    question: "How is my brewing data protected?",
    answer:
      "Your recipes and brewing data are stored securely and are private by default. You control what information to share publicly. We don't sell or share your personal data with third parties.",
    category: "general",
  },

  // Brewing Questions
  {
    id: "calculation-accuracy",
    question: "How accurate are the brewing calculations?",
    answer:
      "BrewTracker uses established brewing formulas and industry standards for all calculations. However, actual brewing results can vary due to equipment efficiency, ingredient variations, and process differences.",
    category: "brewing",
  },
  {
    id: "recipe-scaling",
    question: "Can I scale recipes to different batch sizes?",
    answer:
      "Yes! BrewTracker automatically scales ingredient amounts when you change the batch size. All calculations (OG, FG, ABV, IBU, SRM) are updated accordingly.",
    category: "brewing",
  },

  // Technical Questions
  {
    id: "mobile-support",
    question: "Does BrewTracker work on mobile?",
    answer:
      "Yes! This Android app provides full mobile access to BrewTracker. You can manage recipes, track brew sessions, and access all features on the go.",
    category: "technical",
  },
  {
    id: "offline-access",
    question: "Does BrewTracker work offline?",
    answer:
      "Partial offline support is available. Cached recipes and static data (ingredients, beer styles) can be accessed offline. Full offline mode is planned for future releases.",
    category: "technical",
  },

  // Features
  {
    id: "brew-sessions",
    question: "What's the difference between recipes and brew sessions?",
    answer:
      "Recipes are your planned brewing formulations with calculated values. Brew sessions are records of actual brewing attempts, where you can log real measurements, track fermentation progress, and note any deviations from the plan.",
    category: "features",
  },
];

export default function HelpAndSupportScreen() {
  const theme = useTheme();
  const styles = helpAndSupportStyles(theme);

  const [openFAQs, setOpenFAQs] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const handleGoBack = () => {
    router.back();
  };

  const handleExternalLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Failed to open in-app browser:", error);
      try {
        await Linking.openURL(url);
      } catch (linkingError) {
        console.error("Failed to open external browser:", linkingError);
        Alert.alert(
          "Error",
          "Unable to open the link. Please check your internet connection and try again.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleBugReport = async () => {
    const appVersion = Constants.expoConfig?.version || "N/A";
    const versionCode = `${Constants.platform?.android?.versionCode || "N/A"}`;

    const issueTemplate = encodeURIComponent(
      `
## Bug Description
[Describe the bug here]

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Environment
- App Version: ${appVersion}
- Device: Android
- Build: ${versionCode}

## Additional Information
Reported via BrewTracker Android App
    `.trim()
    );

    const githubUrl = `https://github.com/jackmisner/BrewTrackerAndroid/issues/new?body=${issueTemplate}&labels=bug,android`;
    await handleExternalLink(githubUrl);
  };

  const handleFeatureRequest = async () => {
    const appVersion = Constants.expoConfig?.version || "0.1.0";

    const featureRequestTemplate = encodeURIComponent(
      `
## Feature Title
[Brief description of the feature]

## Category
- [ ] UI/UX - Interface improvements
- [ ] Functionality - New brewing features
- [ ] Performance - Speed and efficiency
- [ ] Integration - External tools/formats
- [ ] Other

## Priority
- [ ] Low - Nice to have
- [ ] Medium - Would improve workflow
- [ ] High - Important for brewing process

## Feature Description
[Detailed description of the feature you'd like to see]

## Use Case
[Describe when and why you would use this feature. What problem does it solve?]

## Proposed Solution
[How do you envision this feature working? Include any specific implementation ideas.]

## Alternative Solutions
[Are there other ways to solve this problem? Have you considered any workarounds?]

## Additional Context
- App Version: ${appVersion}
- Platform: Android

## Environment
Any additional context about your brewing setup or usage patterns that might be relevant.

Requested via BrewTracker Android App
    `.trim()
    );

    const githubUrl = `https://github.com/jackmisner/BrewTrackerAndroid/issues/new?title=Feature%20Request%3A%20&body=${featureRequestTemplate}&labels=feature-request,android`;
    await handleExternalLink(githubUrl);
  };

  const toggleFAQ = (id: string) => {
    setOpenFAQs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const categories = [
    { id: "all", label: "All" },
    { id: "general", label: "General" },
    { id: "brewing", label: "Brewing" },
    { id: "features", label: "Features" },
    { id: "technical", label: "Technical" },
  ];

  const filteredFAQs =
    activeCategory === "all"
      ? faqData
      : faqData.filter(item => item.category === activeCategory);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleBugReport}
            >
              <View style={styles.actionIcon}>
                <MaterialIcons
                  name="bug-report"
                  size={24}
                  color={theme.colors.error}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Report a Bug</Text>
                <Text style={styles.actionSubtitle}>
                  Found an issue? Let us know
                </Text>
              </View>
              <MaterialIcons
                name="open-in-new"
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleFeatureRequest}
            >
              <View style={styles.actionIcon}>
                <MaterialIcons
                  name="lightbulb"
                  size={24}
                  color={theme.colors.warning}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Request a Feature</Text>
                <Text style={styles.actionSubtitle}>
                  Suggest improvements or new features
                </Text>
              </View>
              <MaterialIcons
                name="open-in-new"
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() =>
                handleExternalLink(
                  "https://github.com/jackmisner/BrewTrackerAndroid"
                )
              }
            >
              <View style={styles.actionIcon}>
                <MaterialIcons
                  name="code"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>GitHub Repository</Text>
                <Text style={styles.actionSubtitle}>
                  View source code and contribute
                </Text>
              </View>
              <MaterialIcons
                name="open-in-new"
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Guide Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Guide</Text>
          <View style={styles.card}>
            <View style={styles.guideSection}>
              <View style={styles.iconHeader}>
                <MaterialIcons
                  name="receipt"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.guideTitle}>Recipe Management</Text>
              </View>
              <Text style={styles.guideText}>
                Create and manage recipes with automatic brewing calculations.
                Add ingredients, adjust batch sizes, and track recipe versions.
                Share recipes publicly or keep them private.
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.guideSection}>
              <View style={styles.iconHeader}>
                <MaterialIcons
                  name="science"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.guideTitle}>Brew Sessions</Text>
              </View>
              <Text style={styles.guideText}>
                Track your brewing from start to finish. Log gravity readings,
                fermentation progress, and tasting notes. Compare actual vs.
                predicted values to improve your process.
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.guideSection}>
              <View style={styles.iconHeader}>
                <MaterialIcons
                  name="calculate"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.guideTitle}>Brewing Calculators</Text>
              </View>
              <Text style={styles.guideText}>
                Access brewing calculators for ABV, strike water, dilution,
                hydrometer correction, and unit conversion. All calculations use
                industry-standard formulas.
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  activeCategory === category.id && styles.categoryButtonActive,
                ]}
                onPress={() => setActiveCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    activeCategory === category.id &&
                      styles.categoryButtonTextActive,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* FAQ List */}
          <View style={styles.card}>
            {filteredFAQs.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.faqItem}
                  onPress={() => toggleFAQ(item.id)}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    <MaterialIcons
                      name={
                        openFAQs.has(item.id) ? "expand-less" : "expand-more"
                      }
                      size={24}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                  {openFAQs.has(item.id) && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* External Resources Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>External Resources</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.resourceItem}
              onPress={() => handleExternalLink("https://www.bjcp.org")}
            >
              <MaterialIcons
                name="library-books"
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>BJCP Style Guidelines</Text>
                <Text style={styles.resourceSubtitle}>
                  Official beer style guidelines
                </Text>
              </View>
              <MaterialIcons
                name="open-in-new"
                size={20}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}
