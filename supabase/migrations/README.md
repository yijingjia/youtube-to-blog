# Supabase Database Setup Guide

## 📋 Step 1: Create a Supabase Project

1. Visit https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in project information:
   - **Name**: `youtube-to-blog` (or any name you prefer)
   - **Database Password**: Set a strong password (save it securely)
   - **Region**: Choose the region closest to you
5. Wait for the project to be created (approximately 2-3 minutes)

## 🔑 Step 2: Get API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following information:
   - **Project URL** (similar to `https://xxxxx.supabase.co`)
   - **anon public** key (public key)
   - **service_role** key (server-side key, **keep secret!**)

## 🗄️ Step 3: Execute Database Migration

### Method A: Using Supabase Dashboard (Recommended)

1. In the project, go to **SQL Editor**
2. Click "New Query"
3. Copy the content of the `001_initial_schema.sql` file
4. Paste it into the editor
5. Click **Run** or press `Cmd/Ctrl + Enter`
6. Wait for execution to complete (you should see a "Success" message)

### Method B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## ✅ Step 4: Verify Setup

1. Check in **Table Editor**, you should see the following tables:
   - `channels` ✅
   - `videos` ✅
   - `transcripts` ✅
   - `articles` ✅
   - `profiles` ✅
   - `user_favorites` ✅
   - `processing_logs` ✅

2. Check the `channels` table, there should be sample data (MKRHD channel)

## 🔐 Step 5: Configure Environment Variables

Copy the following to your environment variable files:

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (`.env`)
```env
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📊 Database Schema Overview

### Core Tables

1. **channels** - YouTube channel information
2. **videos** - Video metadata
3. **transcripts** - Transcripts (original and translations)
4. **articles** - AI-generated blog articles

### User Tables

5. **profiles** - User profiles (automatically created from auth.users)
6. **user_favorites** - User's favorited articles

### System Tables

7. **processing_logs** - Processing logs

## 🔒 Security Features

- ✅ Row Level Security (RLS) enabled
- ✅ All user data tables have access control
- ✅ Public data (articles, videos) accessible anonymously
- ✅ User data (favorites, history) only accessible by the user themselves

---

**Note**: Keep your `service_role` key secure! It has full access that bypasses RLS and should only be used on the server side!
