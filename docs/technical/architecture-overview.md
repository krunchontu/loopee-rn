# Loopee Technical Architecture Overview

This document provides a high-level view of the Loopee app architecture with the new feature enhancements.

## System Architecture

```mermaid
graph TD
    subgraph Client ["Client (React Native)"]
        UI[UI Components]
        Screens[Screen Components]
        Services[Service Layer]
        Providers[Context Providers]
        Navigation[Navigation]
        Store[State Management]
    end
    
    subgraph Backend ["Backend (Supabase)"]
        Auth[Authentication]
        DB[Database]
        Storage[File Storage]
        Functions[Database Functions]
        Realtime[Realtime Subscriptions]
    end
    
    Services -->|API Calls| Backend
    Providers -->|Auth State| Services
    UI --> Providers
    Screens --> UI
    Screens --> Services
    Navigation --> Screens
    Store --> UI
    Realtime -->|Updates| Store
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Components
    participant Service as Service Layer
    participant Store as State Management
    participant API as Supabase API
    participant DB as Database
    
    User->>UI: Interact (e.g., add toilet)
    UI->>Service: Request action
    Service->>API: API call
    API->>DB: Execute query/mutation
    DB->>API: Return result
    API->>Service: Response
    Service->>Store: Update state
    Store->>UI: Reflect changes
    UI->>User: Display updated UI
```

## Component Architecture

The app follows a layered architecture pattern:

1. **UI Layer**: Presentational components
2. **Screen Layer**: Screen components combining UI elements
3. **Service Layer**: API calls and business logic
4. **Provider Layer**: Context providers for global state
5. **Navigation Layer**: Routing and navigation
6. **State Management**: Global and local state management

## Key Technical Decisions

### 1. Authentication System

- **Technology**: Supabase Auth
- **Pattern**: JWT-based authentication
- **State Management**: React Context + Local Storage
- **Security**: Token refresh, secure storage

### 2. Database Schema

The enhanced schema includes:

```mermaid
erDiagram
    users ||--o{ user_profiles : has
    user_profiles ||--o{ toilet_submissions : submits
    user_profiles ||--o{ submission_votes : votes
    user_profiles ||--o{ user_favorites : saves
    user_profiles ||--o{ user_follows : follows
    user_profiles ||--o{ user_activity : generates
    toilets ||--o{ toilet_submissions : references
    toilets ||--o{ user_favorites : saved_in
    toilet_submissions ||--o{ submission_votes : receives
    
    users {
        uuid id PK
        string email
        timestamp created_at
    }
    
    user_profiles {
        uuid id PK
        string username
        string display_name
        string avatar_url
        int contribution_count
        bool trusted_status
        jsonb notification_preferences
    }
    
    toilets {
        uuid id PK
        string name
        jsonb location
        numeric rating
        bool is_accessible
        string address
        jsonb amenities
        string building_name
        int floor_level
    }
    
    toilet_submissions {
        uuid id PK
        uuid toilet_id FK
        uuid submitter_id FK
        string submission_type
        string status
        jsonb data
        string reason
        int votes_up
        int votes_down
    }
    
    submission_votes {
        uuid submission_id PK,FK
        uuid user_id PK,FK
        bool vote_type
    }
    
    user_favorites {
        uuid user_id PK,FK
        uuid toilet_id PK,FK
    }
    
    user_follows {
        uuid follower_id PK,FK
        uuid followed_id PK,FK
    }
    
    user_activity {
        uuid id PK
        uuid user_id FK
        string activity_type
        uuid entity_id
        jsonb metadata
    }
```

### 3. API Integration

- **Primary API**: Supabase JavaScript SDK
- **Secondary APIs**: Share API (for social features)
- **API Structure**: Service layer pattern
- **Error Handling**: Centralized error handling via custom hooks

### 4. State Management

- **Global State**: React Context for auth, user preferences
- **Local State**: React's useState for component-specific state
- **Form State**: Formik or React Hook Form for complex forms

### 5. UI Architecture

- **Component Structure**: Atomic design principles
- **Styling**: Paper UI theme + custom styles
- **Responsiveness**: Responsive design using dimensions and breakpoints

## Feature Integration Points

### Authentication System Integration

- **App Entry Point**: Auth state check in `_layout.tsx`
- **Protected Routes**: Higher-order components or route guards
- **UI Integration**: Login/Register modals, profile menu

### Contribution System Integration

- **Toilet Detail View**: Edit and report buttons
- **Map View**: Add toilet button
- **Profile Section**: My submissions list

### Verification System Integration

- **Community Section**: Pending submissions list
- **Admin Dashboard**: For administrators
- **Toilet Detail**: Verification status indicator

### Social Features Integration

- **Toilet Detail**: Share and favorite buttons
- **Profile Section**: Following/Followers tabs
- **Activity Feed**: New section in the app

## Technical Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| Offline support | Use AsyncStorage for caching with sync when online |
| Image uploads | Progressive upload with resize before upload |
| Real-time updates | Supabase realtime subscriptions for critical data |
| Deep linking | React Navigation deep linking configuration |
| Performance | Virtualized lists, lazy loading, and optimized renders |

## Development Workflow

1. **Local Development**: React Native development server
2. **API Testing**: Supabase local emulator
3. **CI/CD**: GitHub Actions for automated testing
4. **Deployment**: Expo EAS Build for app builds
5. **Monitoring**: Firebase Analytics and Crashlytics

## Security Considerations

- **Data Validation**: Server-side validation via PostgreSQL constraints
- **Authentication**: JWT tokens with proper expiration
- **Authorization**: Row-level security policies in Supabase
- **Sensitive Data**: Secure storage for tokens and sensitive information

## Future Scalability Considerations

- **Codebase Scalability**: Feature-based folder structure
- **Performance Optimization**: Implement lazy loading and code splitting
- **Server Scalability**: Supabase's managed scaling capabilities
- **Monitoring**: Set up proper error tracking and performance monitoring
