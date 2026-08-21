export const ingredientImages = {
    // Top Notes
    "Berries": "/Macro_photography_of_a_small_202606251827-Photoroom.jpg",
    "Saffron": "/Macro_photography_of_a_small_202606251827%20(1)-Photoroom.jpg",

    // Heart Notes
    "Rose": "/Macro_photography_of_a_single%2C_202606251827%20(1)-Photoroom.jpg",
    "Tobacco": "/Macro_photography_of_a_single%2C_202606251827%20(2)-Photoroom.jpg",
    
    // Base Notes
    "Vanilla": "/Macro_photography_of_two_dark%2C_202606251827-Photoroom.jpg",
    "Oud": "/Macro_photography_of_a_small_202606251827%20(2)-Photoroom.jpg",
    
    // Strict Fallback
    "Default": "/Macro_photography_of_a_small_202606251827%20(2)-Photoroom.jpg"
};

// Helper function to find the right image
export const getIngredientImage = (noteName) => {
    if (!noteName) return ingredientImages["Default"];
    const key = Object.keys(ingredientImages).find(k => noteName.toLowerCase().includes(k.toLowerCase()));
    return key ? ingredientImages[key] : ingredientImages["Default"];
};
