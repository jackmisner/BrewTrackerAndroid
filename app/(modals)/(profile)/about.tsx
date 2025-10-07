import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@contexts/ThemeContext";
import { aboutStyles } from "@styles/modals/aboutStyles";

export default function AboutScreen() {
  const theme = useTheme();
  const styles = aboutStyles(theme);

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
      }
    }
  };

  const handleEmailLink = async (email: string) => {
    try {
      await Linking.openURL(`mailto:${email}`);
    } catch (error) {
      console.error("Failed to open email:", error);
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
        <Text style={styles.headerTitle}>About Me</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Introduction Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Developer & Brewing Enthusiast</Text>

            <View style={styles.contentSection}>
              <View style={styles.iconHeader}>
                <MaterialIcons
                  name="waving-hand"
                  size={32}
                  color={theme.colors.primary}
                />
                <Text style={styles.sectionTitle}>Hello!</Text>
              </View>
              <Text style={styles.bodyText}>
                I&apos;m Jack Misner, a software developer and homebrewing
                enthusiast who created BrewTracker to solve a personal problem:
                keeping track of recipes, brewing sessions, and all the
                calculations that go into making great beer.
              </Text>

              <View style={styles.photoSection}>
                <Image
                  source={require("@assets/images/jack-beer-hall.jpg")}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <Text style={styles.photoCaption}>
                  Enjoying traditional German beer - experiences like this
                  fueled my passion for brewing and inspired me to create better
                  tools for fellow beer enthusiasts! 🍺
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Project Story Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.iconHeader}>
              <MaterialIcons
                name="sports-bar"
                size={32}
                color={theme.colors.primary}
              />
              <Text style={styles.cardTitle}>The Story Behind BrewTracker</Text>
            </View>

            <View style={styles.contentSection}>
              <Text style={styles.bodyText}>
                As someone who loves both coding and brewing, I found myself
                constantly switching between different tools and spreadsheets to
                manage my homebrew recipes and track my brewing sessions. I
                wanted a single, comprehensive tool that could:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    Calculate brewing metrics accurately (OG, FG, ABV, IBU, SRM)
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    Store and organize recipes with proper version control
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    Track brewing sessions from grain to glass
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    Analyze yeast performance over time
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    Share recipes with the brewing community
                  </Text>
                </View>
              </View>

              <View style={styles.photoSection}>
                <Image
                  source={require("@assets/images/homebrew-bottles-2015.jpg")}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <Text style={styles.photoCaption}>
                  My Golden Promise IPA from 2015 - one of my early brewing
                  successes that highlighted the need for better recipe
                  management and tracking tools. The journey from this batch to
                  BrewTracker spans nearly a decade of brewing passion!
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Technology Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.iconHeader}>
              <MaterialIcons
                name="code"
                size={32}
                color={theme.colors.primary}
              />
              <Text style={styles.cardTitle}>Technology & Approach</Text>
            </View>

            <View style={styles.contentSection}>
              <Text style={styles.bodyText}>
                BrewTracker is built with modern web and mobile technologies
                including React, React Native, TypeScript, Flask, and MongoDB.
                The application focuses on accuracy, usability, and respect for
                brewing science. All calculations are based on established
                brewing formulas and industry standards.
              </Text>
            </View>
          </View>
        </View>

        {/* Open Source Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.iconHeader}>
              <MaterialIcons
                name="public"
                size={32}
                color={theme.colors.primary}
              />
              <Text style={styles.cardTitle}>Open Source & Community</Text>
            </View>

            <View style={styles.contentSection}>
              <Text style={styles.bodyText}>
                BrewTracker is free software licensed under the GPL v3, ensuring
                it remains open and accessible to the brewing community forever.
                This means:
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    The software is completely free for all homebrewers
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    Any improvements must be shared back with the community
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    Commercial derivatives must also be open source
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <Text style={styles.bulletText}>
                    Brewing knowledge and calculations stay accessible to
                    everyone
                  </Text>
                </View>
              </View>

              <Text style={styles.bodyText}>
                I believe in giving back to the brewing and developer
                communities that have taught me so much. Contributions,
                feedback, and feature requests are always welcome!
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.iconHeader}>
              <MaterialIcons
                name="email"
                size={32}
                color={theme.colors.primary}
              />
              <Text style={styles.cardTitle}>Get In Touch</Text>
            </View>

            <View style={styles.contentSection}>
              <Text style={styles.bodyText}>
                Whether you want to discuss brewing, code, or just say hello,
                feel free to reach out:
              </Text>

              <View style={styles.linkList}>
                <TouchableOpacity
                  style={styles.linkItem}
                  onPress={() =>
                    handleExternalLink("https://github.com/jackmisner")
                  }
                >
                  <MaterialIcons
                    name="code"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.linkText}>GitHub Profile</Text>
                  <MaterialIcons
                    name="open-in-new"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkItem}
                  onPress={() =>
                    handleExternalLink(
                      "https://www.linkedin.com/in/jack-d-misner/"
                    )
                  }
                >
                  <MaterialIcons
                    name="work"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.linkText}>LinkedIn</Text>
                  <MaterialIcons
                    name="open-in-new"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkItem}
                  onPress={() => handleEmailLink("jack@brewtracker.co.uk")}
                >
                  <MaterialIcons
                    name="email"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.linkText}>jack@brewtracker.co.uk</Text>
                  <MaterialIcons
                    name="open-in-new"
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Closing Message */}
        <View style={styles.section}>
          <View style={[styles.card, styles.highlightCard]}>
            <Text style={styles.highlightText}>
              Cheers to great beer and clean code! 🍻
            </Text>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}
