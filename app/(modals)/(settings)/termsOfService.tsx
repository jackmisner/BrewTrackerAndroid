/**
 * Terms of Service Screen
 *
 * Displays the comprehensive terms of service for BrewTracker, including
 * usage guidelines, brewing safety notices, UK brewing regulations,
 * user responsibilities, and liability disclaimers.
 *
 * Features:
 * - Prominent brewing safety warnings
 * - UK homebrewing regulations and legal compliance
 * - User rights and responsibilities
 * - Open source licensing (GPL v3) information
 * - Service limitations and disclaimers
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(settings)/termsOfService');
 * ```
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@contexts/ThemeContext";
import { legalContentStyles } from "@styles/modals/legalContentStyles";

export default function TermsOfServiceScreen() {
  const theme = useTheme();
  const styles = legalContentStyles(theme);

  const lastUpdated = "July 2025";

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
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessible={true}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Intro Section */}
      <View style={styles.introSection}>
        <Text style={styles.introTitle}>Terms of Service</Text>
        <Text style={styles.introSubtitle}>
          Guidelines for using BrewTracker safely and responsibly
        </Text>
        <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Welcome Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome to BrewTracker</Text>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              BrewTracker is a free, open-source homebrewing management
              application designed to help the brewing community create, manage,
              and share beer recipes. By using BrewTracker, you agree to these
              Terms of Service.
            </Text>
            <Text style={styles.bodyText}>
              This is a hobby project released under the GPL v3 license to
              ensure it remains free and open for the community. Please read
              these terms carefully, especially the safety disclaimers related
              to homebrewing.
            </Text>
          </View>
        </View>

        {/* CRITICAL: Brewing Safety Notice */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
            ⚠️ IMPORTANT BREWING SAFETY NOTICE
          </Text>

          <View style={styles.card}>
            <View style={styles.criticalBox}>
              <Text style={styles.criticalTitle}>
                Homebrewing involves alcohol production and potentially
                dangerous processes
              </Text>
              <Text style={styles.calloutText}>
                You are solely responsible for:
              </Text>
            </View>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>
                    Following all local laws
                  </Text>{" "}
                  regarding alcohol production and consumption
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>
                    Ensuring proper sanitation
                  </Text>{" "}
                  and safety procedures during brewing
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>
                    Verifying recipe calculations
                  </Text>{" "}
                  independently before brewing
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>
                    Understanding fermentation risks
                  </Text>{" "}
                  including contamination and over-carbonation
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>
                    Using appropriate equipment
                  </Text>{" "}
                  and following manufacturer guidelines
                </Text>
              </View>
            </View>

            <View style={styles.calloutBox}>
              <Text style={styles.calloutTitle}>
                CALCULATION & LEGAL DISCLAIMER
              </Text>
              <Text style={styles.calloutText}>
                BrewTracker calculations are estimates based on standard brewing
                formulas. Actual results may vary significantly due to
                ingredients, equipment efficiency, process variations, and
                environmental conditions.
              </Text>
              <Text style={styles.calloutText}>
                <Text style={styles.bulletStrong}>
                  Always verify critical measurements independently.
                </Text>
              </Text>
              <Text style={styles.calloutText}>
                <Text style={styles.bulletStrong}>
                  No warranty is provided for calculation accuracy or legal
                  compliance. Use at your own risk.
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Service Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Description</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>
              What BrewTracker Provides
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Recipe Management</Text> -
                  Create, edit, and organize beer recipes
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Brewing Calculations</Text>{" "}
                  - Estimate OG, FG, ABV, IBU, and SRM values
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Brew Session Tracking</Text>{" "}
                  - Log fermentation progress and brewing notes
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Community Sharing</Text> -
                  Share recipes publicly with the brewing community
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>BeerXML Support</Text> -
                  Import and export recipes in standard format
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Service Nature</Text>
            <Text style={styles.bodyText}>
              BrewTracker is a{" "}
              <Text style={styles.bulletStrong}>hobby project</Text> provided
              free of charge to the brewing community. It is licensed under GPL
              v3 and maintained by volunteers. There are no guarantees of
              uptime, support response times, or feature availability.
            </Text>
          </View>
        </View>

        {/* UK Brewing Regulations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UK Homebrewing Regulations</Text>

          <View style={styles.card}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Legal Framework</Text>
              <Text style={styles.infoText}>
                Homebrewing in the UK is generally legal and well-regulated.
              </Text>
            </View>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Personal Consumption</Text>{" "}
                  - Beer and cider brewed for personal consumption are typically
                  duty-free
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>No Licensing Required</Text>{" "}
                  - Home production for personal use doesn't require special
                  licensing
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Sale Restrictions</Text> -
                  Selling homebrew generally requires proper licensing and duty
                  payment
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Resources</Text>
            <TouchableOpacity
              onPress={() =>
                handleExternalLink("https://www.gov.uk/guidance/alcohol-duty")
              }
            >
              <Text style={[styles.bodyText, styles.linkText]}>
                • HMRC Alcohol Duty guidance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                handleExternalLink("https://www.gov.uk/alcohol-licensing")
              }
            >
              <Text style={[styles.bodyText, styles.linkText]}>
                • UK Alcohol Licensing information
              </Text>
            </TouchableOpacity>

            <View style={styles.calloutBox}>
              <Text style={styles.calloutText}>
                <Text style={styles.bulletStrong}>Important:</Text> This
                information is for general guidance only and should not be
                considered legal advice. Always consult official sources and
                legal professionals for specific situations.
              </Text>
            </View>
          </View>
        </View>

        {/* Your Responsibilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Responsibilities</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>Legal Compliance</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Age Requirement</Text> - You
                  must be at least 18 years old (UK legal drinking age)
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>UK Brewing Laws</Text> -
                  Comply with UK laws regarding alcohol production for personal
                  consumption
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>HMRC Compliance</Text> -
                  Understand UK homebrewing regulations and duty obligations
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Responsible Use</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Use BrewTracker only for legitimate homebrewing purposes
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Respect the intellectual property and recipes of other users
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Report bugs, security issues, or inappropriate content
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content & IP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Content & Intellectual Property
          </Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>Your Content Rights</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Recipe Ownership</Text> -
                  You retain ownership of your original recipes
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Private Recipes</Text> -
                  Your private recipes remain completely private
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Data Export</Text> - You can
                  export your data anytime using BeerXML format
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>BrewTracker Software</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>GPL v3 License</Text> - The
                  BrewTracker software is licensed under GPL v3
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>Open Source</Text> - Source
                  code is freely available on GitHub
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletStrong}>No Warranty</Text> -
                  Software provided "as is" without warranty
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() =>
                handleExternalLink("https://www.gnu.org/licenses/gpl-3.0.html")
              }
            >
              <Text style={[styles.bodyText, styles.linkText]}>
                View GPL v3 License
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disclaimers & Liability</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>No Warranties</Text>
            <Text style={styles.bodyText}>
              BrewTracker is provided{" "}
              <Text style={styles.bulletStrong}>"AS IS"</Text> and{" "}
              <Text style={styles.bulletStrong}>"AS AVAILABLE"</Text> without
              warranties of any kind, including but not limited to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Accuracy of brewing calculations or suggestions
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Reliability or availability of the service
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Freedom from errors, bugs, or security vulnerabilities
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Limitation of Liability</Text>
            <View style={styles.calloutBox}>
              <Text style={styles.calloutText}>
                <Text style={styles.bulletStrong}>
                  To the maximum extent permitted by law, BrewTracker and its
                  creators shall not be liable for any damages arising from:
                </Text>
              </Text>
            </View>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Brewing accidents, injuries, or property damage
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Recipe results, failed batches, or unexpected outcomes
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Violations of local brewing laws or regulations
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Loss of recipes, brew session data, or account information
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Service interruption, downtime, or discontinuation
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Maximum Liability</Text>
            <Text style={styles.bodyText}>
              Since BrewTracker is provided free of charge, our maximum
              liability is limited to £0 (zero pounds). Users assume all risks
              associated with homebrewing and use of this service.
            </Text>
          </View>
        </View>

        {/* Dispute Resolution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dispute Resolution</Text>

          <View style={styles.card}>
            <Text style={styles.subsectionTitle}>Governing Law</Text>
            <Text style={styles.bodyText}>
              These Terms of Service are governed by the laws of England and
              Wales. Any disputes arising from or relating to these terms or
              your use of BrewTracker will be subject to the exclusive
              jurisdiction of the courts of England and Wales.
            </Text>

            <Text style={styles.subsectionTitle}>Consumer Rights</Text>
            <Text style={styles.bodyText}>
              If you are a consumer resident in the UK, nothing in these terms
              affects your statutory rights under UK consumer protection law,
              including the Consumer Rights Act 2015.
            </Text>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.card}>
            <Text style={styles.bodyText}>
              If you have questions about these Terms of Service or need to
              report violations:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <TouchableOpacity
                  onPress={() => router.push("/(modals)/(profile)/about")}
                >
                  <Text style={[styles.bulletText, styles.linkText]}>
                    Visit the About page for developer contact information
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
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                <Text style={styles.bulletStrong}>Remember:</Text> BrewTracker
                is a tool to assist your brewing journey, but the responsibility
                for safe, legal, and successful brewing always rests with you.
                Brew safely, know your local laws, and enjoy the wonderful world
                of homebrewing! 🍺
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}
