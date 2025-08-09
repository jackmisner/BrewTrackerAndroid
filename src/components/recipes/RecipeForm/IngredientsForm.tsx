import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '@contexts/ThemeContext';
import { RecipeFormData, RecipeIngredient } from '@src/types';
import { createRecipeStyles } from '@styles/modals/createRecipeStyles';

interface IngredientsFormProps {
  recipeData: RecipeFormData;
  onUpdateField: (field: keyof RecipeFormData, value: any) => void;
}

export function IngredientsForm({ recipeData, onUpdateField }: IngredientsFormProps) {
  const theme = useTheme();
  const styles = createRecipeStyles(theme);

  const ingredientsByType = {
    grain: recipeData.ingredients.filter(ing => ing.type === 'grain'),
    hop: recipeData.ingredients.filter(ing => ing.type === 'hop'),
    yeast: recipeData.ingredients.filter(ing => ing.type === 'yeast'),
    other: recipeData.ingredients.filter(ing => ing.type === 'other'),
  };

  const handleAddIngredient = (type: 'grain' | 'hop' | 'yeast' | 'other') => {
    // TODO: Navigate to ingredient picker
    console.log(`Add ${type} ingredient`);
  };

  const renderIngredientSection = (type: 'grain' | 'hop' | 'yeast' | 'other', title: string) => {
    const ingredients = ingredientsByType[type];
    
    return (
      <View style={styles.ingredientSection} key={type}>
        <View style={styles.ingredientSectionHeader}>
          <Text style={styles.ingredientSectionTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.addIngredientButton}
            onPress={() => handleAddIngredient(type)}
          >
            <MaterialIcons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.addIngredientText}>Add</Text>
          </TouchableOpacity>
        </View>

        {ingredients.length === 0 ? (
          <View style={styles.emptyIngredientContainer}>
            <Text style={styles.emptyIngredientText}>
              No {type} ingredients added yet
            </Text>
          </View>
        ) : (
          <View style={styles.ingredientsList}>
            {ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientAmount}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.ingredientRemoveButton}
                  onPress={() => {
                    const newIngredients = recipeData.ingredients.filter(
                      (_, i) => i !== index
                    );
                    onUpdateField('ingredients', newIngredients);
                  }}
                >
                  <MaterialIcons name="close" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Recipe Ingredients</Text>
      <Text style={styles.sectionDescription}>
        Add ingredients to build your recipe. Start with grains, then add hops, yeast, and any other ingredients.
      </Text>

      {renderIngredientSection('grain', 'Grains & Fermentables')}
      {renderIngredientSection('hop', 'Hops')}
      {renderIngredientSection('yeast', 'Yeast')}
      {renderIngredientSection('other', 'Other Ingredients')}

      {recipeData.ingredients.length === 0 && (
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <MaterialIcons name="lightbulb-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.infoTitle}>Getting Started</Text>
          </View>
          <Text style={styles.infoText}>
            Start by adding your base grains, then specialty grains for flavor and color. 
            Add hops for bitterness and aroma, choose your yeast strain, and any other ingredients 
            like spices or clarifying agents.
          </Text>
        </View>
      )}
    </View>
  );
}