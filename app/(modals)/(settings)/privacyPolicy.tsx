/**
 * Privacy Policy Screen
 *
 * Displays the comprehensive privacy policy for BrewTracker, including
 * information collection practices, data usage, GDPR compliance, and user
 * rights. Adapted from the web app's privacy policy for mobile viewing.
 *
 * Features:
 * - GDPR and UK Data Protection Act 2018 compliance
 * - Detailed information collection and usage policies
 * - User rights and data management information
 * - Contact information for privacy inquiries
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(settings)/privacyPolicy');
 * ```
 */

import React from "react";
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
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@contexts/ThemeContext";
import { legalContentStyles } from "@styles/modals/legalContentStyles";

export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  const styles = legalContentStyles(theme);

  const lastUpdated = "January 2025";

  const handleGoBack = () => {
    router.back();
  };

  const handleExternalLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Failed to open link:", error);
      try {
        await Linking.openURL(url);
      } catch (linkingError) {
        console.error("Failed to open external browser:", linkingError);
        Alert.alert(
          "Unable to open link",
          "Could not open the external link. Please check your internet connection and try again.",
          [{ text: "OK" }]
        );
      }
    }
  };

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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Intro Section */}
      <View style={styles.introSection}>
        <Text style={styles.introTitle}>Your Privacy Matters</Text>
        <Text style={styles.introSubtitle}>
          How BrewTracker handles your brewing data and personal information
        </Text>
        <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Commitment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Our Commitment to Your Privacy
          </Text>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              BrewTracker is a free, open-source homebrewing management
              application created to serve the brewing community. We are
              committed to protecting your privacy and being transparent about
              how we handle your brewing data.
            </Text>
            <Text style={styles.bodyText}>
              As a GPL v3 licensed project, our commitment extends to keeping
              both our software and practices open and community-focused.
            </Text>
          </View>
        </View>

        {/* Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>Account Information</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Username</Text> - For
                  account identification and recipe attribution
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Email address</Text> - For
                  account recovery and important notifications
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Password</Text> - Securely
                  hashed using industry-standard encryption
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>User preferences</Text> -
                  Unit settings, display preferences
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Brewing Data</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Recipes</Text> -
                  Ingredients, measurements, brewing notes, style information
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Brew sessions</Text> -
                  Gravity readings, temperatures, fermentation logs, tasting
                  notes
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Calculations</Text> - OG,
                  FG, ABV, IBU, SRM values and brewing metrics
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Technical Information</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Device data for responsive design
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  IP address for security and basic analytics
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Session data and authentication tokens
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* How We Use Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>
              Core Application Services
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Provide brewing calculations and recipe management
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Enable brew session tracking and fermentation monitoring
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Support BeerXML import/export functionality
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Maintain user preferences and settings
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Community Features</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Enable public recipe sharing with proper attribution
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Support community recipe discovery and cloning
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Application Improvement</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Analyze usage patterns to improve features
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Identify and fix bugs or performance issues
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Information Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information Sharing</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>What We Share</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Public Recipes</Text> - When
                  you choose to make recipes public, they become visible to the
                  community with your username attribution
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Anonymous Statistics</Text>{" "}
                  - Aggregated, non-identifiable usage data
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>What We Never Share</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Personal Information</Text>{" "}
                  - Email addresses, passwords, or account details
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Private Recipes</Text> -
                  Your private brewing data remains completely private
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>No Commercial Use</Text> -
                  We never sell your data to third parties
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Data Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Security & Protection</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>Security Measures</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Password Security</Text> -
                  All passwords are hashed using industry-standard bcrypt
                  encryption
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Authentication</Text> - JWT
                  token-based authentication with secure session management
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Mobile Security</Text> -
                  Android app uses SecureStore for sensitive data
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Code Transparency</Text> -
                  Open source codebase allows community security review
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Data Backup & Recovery</Text>
            <Text style={styles.bodyText}>
              We maintain regular backups of brewing data to prevent loss.
              However, as a hobby project, we recommend users also export their
              important recipes using the BeerXML export feature for personal
              backup.
            </Text>
          </View>
        </View>

        {/* Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights & Choices</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>Data Access & Control</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Access Your Data</Text> -
                  View all your recipes, sessions, and account information
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Export Data</Text> -
                  Download your recipes in BeerXML format anytime
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Modify Information</Text> -
                  Edit recipes, sessions, and account details
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Privacy Settings</Text> -
                  Control which recipes are public or private
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Account Deletion</Text> -
                  Delete your account and all associated data
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* GDPR Compliance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GDPR & UK Data Protection</Text>

          <View style={styles.card}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>
                UK Data Protection Act 2018 & UK GDPR Compliance
              </Text>
              <Text style={styles.infoText}>
                BrewTracker is operated from the United Kingdom and complies
                with the UK Data Protection Act 2018 and UK GDPR. Your personal
                data is processed and stored in accordance with UK data
                protection laws.
              </Text>
            </View>

            <Text style={styles.subsectionTitle}>Your GDPR Rights</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Access</Text> - Request a
                  copy of your personal data
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Rectification</Text> -
                  Correct inaccurate personal data
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Erasure</Text> - Request
                  deletion of your personal data
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Portability</Text> - Export
                  your data in a machine-readable format
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Supervisory Authority</Text>
            <Text style={styles.bodyText}>
              You have the right to lodge a complaint with the UK Information
              Commissioner's Office (ICO) if you believe your data protection
              rights have been violated.
            </Text>
            <TouchableOpacity
              onPress={() => handleExternalLink("https://ico.org.uk")}
            >
              <Text style={[styles.bodyText, styles.linkText]}>
                Visit ico.org.uk for more information
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Children's Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>

          <View style={styles.card}>
            <View style={styles.calloutBox}>
              <Text style={styles.calloutText}>
                BrewTracker is designed for adults of legal drinking age. In the
                UK, we do not knowingly collect personal information from
                individuals under 18 years of age, as this is the legal age for
                purchasing and consuming alcohol.
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>

          <View style={styles.card}>
            <Text style={styles.bodyText}>
              If you have questions, concerns, or requests regarding this
              Privacy Policy or your personal data, please contact us:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <TouchableOpacity
                  onPress={() => router.push("/(modals)/(profile)/about")}
                >
                  <Text style={[styles.bulletText, styles.linkText]}>
                    Visit the About page for contact information
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <TouchableOpacity
                  onPress={() =>
                    router.push("/(modals)/(profile)/helpAndSupport")
                  }
                >
                  <Text style={[styles.bulletText, styles.linkText]}>
                    Check the Help & Support page
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Email: privacy@brewtracker.app (for privacy-specific
                  inquiries)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}
