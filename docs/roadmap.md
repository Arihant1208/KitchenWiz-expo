# KitchenWiz Mobile - Roadmap & Future Improvements

This document outlines planned features and technical improvements for KitchenWiz Mobile.

---

## ✅ Completed (v1.0)

- [x] Core inventory management (add, edit, delete)
- [x] Receipt scanning with Gemini Vision
- [x] AI recipe generation from inventory
- [x] Recipe saving and favorites
- [x] Weekly meal plan generation
- [x] Smart shopping list with inventory sync
- [x] AI chat assistant
- [x] User profile and preferences
- [x] Local data persistence (AsyncStorage)
- [x] Backend API (Express + PostgreSQL)
- [x] Bottom tab navigation

---

## 🚀 Short Term (v1.1 - v1.2)

### Features
- [ ] **Barcode Scanning**: Use device camera to scan product barcodes
  - Integrate with Open Food Facts API
  - Auto-populate item details
  - Instant nutritional information

- [ ] **Push Notifications**: 
  - Expiry reminders (1 day, 3 days before)
  - Meal prep reminders
  - Shopping list reminders

- [ ] **Voice Input**:
  - "Add 2 eggs to inventory"
  - "What can I cook tonight?"
  - Hands-free kitchen mode

- [ ] **Improved Receipt Scanning**:
  - Multi-page receipt support
  - Better handling of blurry images
  - Price extraction for budget tracking

- [ ] **Dark Mode**:
  - System preference detection
  - Manual toggle option
  - OLED-optimized colors

### Technical
- [ ] Unit tests for geminiService
- [ ] E2E tests with Detox
- [ ] Performance optimization (memo, useCallback)
- [ ] Image caching for recipe thumbnails

---

## 📅 Medium Term (v1.3 - v1.5)

### Features
- [ ] **User Authentication**:
  - Email/password signup
  - Google/Apple Sign-In
  - Social login options
  - Profile sync across devices

- [ ] **Multi-User Households**:
  - Shared inventory between family members
  - Shared shopping lists
  - Permission levels (admin, member)

- [ ] **Nutritional Tracking**:
  - Macro breakdown (protein, carbs, fat)
  - Daily/weekly calorie tracking
  - Nutritional goals setting
  - Integration with health apps

- [ ] **Recipe Import**:
  - Paste URL to import recipe
  - Parse from popular recipe sites
  - Manual recipe creation
  - Recipe scaling by servings

- [ ] **Pantry Staples**:
  - Define "must-have" items
  - Auto-add to shopping list when low
  - Smart restocking suggestions

- [ ] **Budget Tracking**:
  - Track spending from receipts
  - Monthly food budget setting
  - Spending analytics
  - Cost per meal estimation

### Technical
- [ ] Migrate to React Context or Zustand
- [ ] Implement offline-first with sync queue
- [ ] Add WebSocket for real-time household sync
- [ ] GraphQL API option

---

## 🌟 Long Term / Blue Sky (v2.0+)

### Features
- [ ] **Grocery API Integration**:
  - Connect to Instacart, Walmart, Kroger APIs
  - One-tap add shopping list to cart
  - Price comparison across stores
  - Delivery scheduling

- [ ] **Smart Kitchen Integration**:
  - Connect to smart refrigerators
  - Smart scale integration for quantity tracking
  - IoT expiry sensors

- [ ] **Social Features**:
  - Share recipes with friends
  - Community recipe collections
  - Meal plan sharing
  - Family group challenges

- [ ] **AI Enhancements**:
  - Personalized nutrition recommendations
  - Learn from cooking preferences over time
  - Smart grocery predictions
  - "Use it before you lose it" proactive suggestions

- [ ] **Augmented Reality**:
  - AR pantry visualization
  - Interactive cooking instructions
  - Ingredient identification via camera

- [ ] **Wearable Support**:
  - Apple Watch companion app
  - Quick add from wrist
  - Shopping list on wrist
  - Timer integration

- [ ] **Meal Subscription Integration**:
  - HelloFresh, Blue Apron compatibility
  - Auto-import ingredients from meal kits
  - Recipe sync from subscriptions

---

## 🔧 Technical Debt

### Code Quality
- [ ] Refactor large screen components into smaller pieces
- [ ] Create shared hooks (useDebounce, useLocalStorage)
- [ ] Add prop validation with runtime checks
- [ ] Improve error boundaries

### Performance
- [ ] Implement virtualized lists for large inventories
- [ ] Lazy load screens
- [ ] Optimize re-renders with React.memo
- [ ] Image optimization and progressive loading

### Testing
- [ ] Unit tests for all services
- [ ] Integration tests for API layer
- [ ] E2E tests for critical user flows
- [ ] Visual regression testing

### Infrastructure
- [ ] CI/CD pipeline with EAS Build
- [ ] Automated versioning
- [ ] Staging environment
- [ ] A/B testing framework

---

## 💡 Community Requested Features

*This section will be updated based on user feedback*

- [ ] Multiple language support (i18n)
- [ ] Metric/Imperial unit switching
- [ ] Dietary templates (vegan starter kit, etc.)
- [ ] Print shopping list
- [ ] Export/import data
- [ ] Recipe nutrition label format
- [ ] Cooking tutorial videos
- [ ] Seasonal ingredient suggestions

---

## 📊 Metrics Goals

### User Engagement
- DAU/MAU ratio > 30%
- Average session duration > 5 minutes
- Recipes generated per user per week > 2

### Technical
- App crash rate < 0.1%
- API response time < 200ms
- App size < 50MB

### Business
- App Store rating > 4.5
- User retention (D7) > 40%
- Organic growth > 20% MoM

---

## Contributing

We welcome contributions! If you'd like to work on any of these features:

1. Check if there's an existing issue
2. Open a new issue to discuss the feature
3. Fork the repository
4. Create a feature branch
5. Submit a pull request

For major features, please discuss first in GitHub Discussions.
