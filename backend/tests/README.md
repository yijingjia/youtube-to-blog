# Backend Tests

This directory contains all test scripts for the YouTube to Blog backend system.

## Test Files

### 1. Configuration Test (`test_config.py`)
Validates environment variables and database connection.

```bash
uv run python tests/test_config.py
```

**Tests:**
- Python version (>=3.12)
- Required directories (src/, downloads/, logs/)
- Supabase connection
- Required environment variables

### 2. API Connection Test (`test_apis.py`)
Tests individual API services.

```bash
uv run python tests/test_apis.py
```

**Tests:**
- YouTube Data API (fetch video details)
- GLM-4 API (translation)
- Supabase database write/read

### 3. Pipeline Test (`test_pipeline.py`)
End-to-end test of the complete video processing pipeline.

```bash
uv run python tests/test_pipeline.py
```

**Tests:**
- Fetch video metadata from YouTube
- Fetch English transcript (native or Whisper)
- Translate to target languages (zh-Hans, ja)
- Generate blog articles
- Save all data to database

**Test Video:** Rick Astley - Never Gonna Give You Up (dQw4w9WgXcQ)

**Expected Duration:** ~2 minutes

### 4. Cleanup Scripts

#### `cleanup_test_data.py`
Removes test channel and related data.

```bash
uv run python tests/cleanup_test_data.py
```

#### `cleanup_video.py`
Removes a specific test video and related data (transcripts, articles).

```bash
uv run python tests/cleanup_video.py
```

**Default Video ID:** dQw4w9WgXcQ

---

## Quick Start

### First Time Setup

1. **Run configuration test**
   ```bash
   uv run python tests/test_config.py
   ```

2. **Test API connections**
   ```bash
   uv run python tests/test_apis.py
   ```

3. **Run end-to-end pipeline test**
   ```bash
   uv run python tests/test_pipeline.py
   ```

### Clean Test Data

```bash
# Clean all test data
uv run python tests/cleanup_test_data.py

# Clean specific video
uv run python tests/cleanup_video.py
```

---

## Test Checklist

Before running the main application, ensure:

- [ ] `test_config.py` passes (all environment variables set)
- [ ] `test_apis.py` passes (all API connections work)
- [ ] `test_pipeline.py` passes (complete pipeline works)
- [ ] Verify data in Supabase dashboard

---

## Troubleshooting

### Test Fails with Import Errors

**Problem:** `ModuleNotFoundError: No module named 'src'`

**Solution:** Ensure you're running tests from the backend directory:
```bash
cd backend
uv run python tests/test_xxx.py
```

### Test Fails with API Errors

**Problem:** YouTube/GLM API returns errors

**Solution:**
1. Check `.env` file has correct API keys
2. Verify API quota/balance is sufficient
3. Run `test_apis.py` to check individual services

### Test Pipeline is Slow

**Problem:** Whisper transcription takes too long

**Solution:**
- This is normal for first run (downloads Whisper model)
- Subsequent runs will be faster
- YouTube native transcripts (when available) are much faster

---

## Expected Test Results

### `test_config.py`
```
✓ Python version: 3.12.x
✓ Required directories exist
✓ Supabase connection successful
✓ All required environment variables set
```

### `test_apis.py`
```
✓ YouTube API: Video details fetched
✓ GLM-4 API: Translation successful
✓ Supabase: Write/read successful
```

### `test_pipeline.py`
```
✓ Video record created
✓ English transcript saved (XXX words)
✓ Chinese article generated
✓ Japanese article generated
✓ Video processing complete: dQw4w9WgXcQ
🎉 Pipeline test PASSED!
```

---

## Notes

- All tests use the `uv` Python package manager
- Tests automatically add `src/` to Python path
- Test data is cleaned up between runs
- Pipeline test processes a real YouTube video (3.29MB audio)
