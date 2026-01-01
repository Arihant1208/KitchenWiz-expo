# KitchenWiz Mobile - Features Documentation

KitchenWiz is a comprehensive kitchen management app powered by Google's Gemini AI. It helps users manage their kitchen inventory, plan meals, reduce food waste, and streamline grocery shopping.

## 1. Smart Inventory Management

### Receipt Scanning (AI-Powered)
- **Functionality**: Users can take photos of grocery receipts
- **AI Processing**: Gemini Vision API extracts item names, quantities, and categories
- **Auto-Categorization**: Items automatically sorted into produce, dairy, meat, pantry, frozen, or other
- **Expiry Estimation**: AI estimates expiry dates based on food type
- **Supported Formats**: Images (JPEG, PNG)

### Manual Entry
- Add items with name, quantity, category, and expiry date
- Quick-add interface with category selection
- Edit existing items to update quantities or dates

### Stock Tracking
- View all ingredients organized by category
- Color-coded category badges for easy identification
- Search and filter functionality
- Real-time inventory count

### Expiry Alerts
- Visual indicators for items expiring within 3 days
- Color-coded expiry status (green, yellow, red)
- Dashboard warnings for expiring items
- Helps reduce food waste

## 2. AI Recipe Discovery

### Inventory-Based Suggestions
- Generates recipes specifically using your current stock
- Prioritizes ingredients close to expiry
- Minimizes food waste and unnecessary purchases
- Adapts to available quantities

### Match Score
- Each recipe shows a 0-100% match score
- Higher scores = more ingredients already owned
- Helps users decide which recipes to try
- Visual badges for quick identification

### Dietary Personalization
- Respects user dietary restrictions (vegetarian, vegan, gluten-free, etc.)
- Accounts for allergies (automatically excluded from recipes)
- Adapts to cooking skill level (beginner, intermediate, advanced)
- Considers cuisine preferences (Italian, Mexican, Asian, etc.)

### Recipe Details
- Full ingredient list with quantities
- Step-by-step cooking instructions
- Prep time and cook time estimates
- Calorie information
- Tags for dietary categories

### Saved Recipes
- Heart icon to save favorite recipes
- Separate "Saved" tab for quick access
- Persistent storage across sessions
- Easy unsave functionality

## 3. Intelligent Meal Planning

### Weekly Auto-Planner
- Generates complete 7-day meal plans
- Covers breakfast, lunch, and dinner
- Tailored to user goals (weight loss, muscle gain, maintenance, budget-friendly)
- Considers maximum cooking time preference

### Personalization Factors
- **Dietary Restrictions**: Vegetarian, vegan, keto, etc.
- **Allergies**: Excluded ingredients
- **Cuisine Preferences**: Preferred food styles
- **Cooking Skill**: Recipe complexity matching
- **Time Constraints**: Max cooking time per meal

### Nutritional Overview
- Daily calorie totals
- Per-meal calorie breakdown
- Prep and cook time for each meal
- Visual meal type indicators (breakfast/lunch/dinner icons)

### Inventory Integration
- Prioritizes using available ingredients
- Reduces food waste
- Suggests meals based on expiring items

## 4. Automated Shopping List

### AI-Powered Generation
- Analyzes weekly meal plan requirements
- Compares against current inventory
- Creates list of missing ingredients only
- Avoids duplicate purchases

### Smart Features
- Category organization (produce, dairy, meat, etc.)
- Checkbox for marking purchased items
- Quantity specifications
- Swipe-to-delete functionality

### Inventory Integration
- "Move to Stock" feature for checked items
- Automatic transfer to inventory
- Default expiry date assignment
- Seamless workflow from shopping to stock

### Manual Management
- Add custom items
- Edit quantities
- Remove items
- Clear all checked items

## 5. AI Kitchen Assistant

### Conversational Interface
- Natural language chat
- Context-aware responses
- Knows your inventory and preferences
- Helpful cooking tips and advice

### Capabilities
- Recipe suggestions based on ingredients
- Cooking technique explanations
- Ingredient substitution recommendations
- Meal prep tips
- Nutritional information
- Food storage advice

### Quick Suggestions
- Pre-populated conversation starters
- Common kitchen questions
- One-tap query input
- Relevant to user context

## 6. Personalization Profile

### User Information
- Name setting
- Household size (affects portions)

### Dietary Settings
- **Restrictions**: Vegetarian, Vegan, Gluten-Free, Dairy-Free, Keto, Paleo, Halal, Kosher
- **Allergies**: Free-text input for any allergens
- Multi-select interface

### Goals
- Weight Loss
- Muscle Gain
- Maintenance
- Budget-Friendly

### Cooking Preferences
- **Skill Level**: Beginner, Intermediate, Advanced
- **Max Cooking Time**: 15-180 minutes
- **Cuisine Preferences**: Italian, Mexican, Chinese, Indian, Japanese, Thai, Mediterranean, American, French

### Settings Sync
- Auto-save on changes
- Persistent across sessions
- Affects all AI-generated content

## 7. Dashboard Overview

### Quick Stats
- Total items in inventory
- Items expiring soon count
- Visual category breakdown

### Category Distribution
- Color-coded category chart
- Item counts per category
- Visual overview of pantry composition

### Alerts
- Expiring items warning
- Low stock indicators
- Quick action prompts

## 8. Data Persistence

### Local Storage (Default)
- All data stored on device
- Works completely offline
- Fast access times
- Privacy-focused

### Cloud Sync (Optional)
- Backend API available
- PostgreSQL database
- Multi-device sync capability
- Backup and restore

## 9. User Experience Features

### Navigation
- Bottom tab navigation (6 main sections)
- Intuitive icons
- Quick screen switching
- Consistent design language

### Visual Design
- Clean, modern interface
- Emerald green primary color
- Category-specific color coding
- Smooth animations

### Accessibility
- High contrast text
- Touch-friendly buttons
- Clear labeling
- Responsive layouts
