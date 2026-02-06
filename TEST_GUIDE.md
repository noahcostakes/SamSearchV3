# Search Flow Test Guide

## Quick Start

### 1. Start All Services
```powershell
.\Start SamSearch.bat
```
Wait for all 3 windows to open (Backend, Celery Worker, Frontend).

### 2. Run Automated Test
```powershell
python test_search_flow.py
```

This will:
- ✓ Create a test user and profile
- ✓ Start a SAM.gov search
- ✓ Poll for completion
- ✓ Test 7 different filtering scenarios

---

## Manual Test (Using UI)

### Step 1: Setup Profile
1. Go to http://localhost:5173
2. Login/Register with any email
3. Go to **Settings** → Add your SAM API key
4. Go to **Profile** → Fill in:
   - Company Name: "Test Cloud Solutions"
   - Primary NAICS: 541511
   - Core Competencies: Cloud Migration, DevOps
   - Priority Keywords: cloud, cybersecurity
   - Clearance Level: Secret
   - Contract Types: FFP, IDIQ

### Step 2: Run Search
1. Go to **Search**
2. Enter keyword: **"cloud"**
3. Click **Search**
4. Wait for results (30-60 seconds)

### Step 3: Test Filtering
Once results appear, test these filters:

**Filter 1: By Relevance Score**
- Look for the badge showing score (e.g., "85")
- High scores (>=70) should appear first

**Filter 2: By Set-Aside**
- Check "Small Business" tag
- Should match your certifications

**Filter 3: By NAICS**
- Opportunities with NAICS 541511 should rank higher

**Filter 4: By Keywords**
- Opportunities with "cloud" in title should appear
- Priority keywords boost relevance

**Filter 5: By Deadline**
- Response deadlines should be within range
- Upcoming deadlines appear first

---

## Expected Results

### Search Results
- **Total Records**: 10-100 opportunities
- **High Relevance** (>=70): 5-20 opportunities
- **Medium Relevance** (50-69): 10-30 opportunities
- **Low Relevance** (<50): Remaining

### Filtering Tests
- All 7 filter types should work
- Combined filters should narrow results
- No JavaScript errors in console

### AI Scoring
Opportunities should have scores based on:
- ✓ NAICS code match
- ✓ Priority keyword match (+10-20 bonus)
- ✓ Past performance keywords (+5-15 bonus)
- ✓ Clearance level match (+10 if match, -20 if gap)
- ✓ Contract type preference (+5 if match)
- ✓ Blacklist keywords (0 if found)

---

## Troubleshooting

### "Searching forever" - Celery worker not running
```powershell
.\start-celery.bat
```

### 429 Error - Rate limit hit
```powershell
python clear-rate-limits.py
```

### No Results - Invalid SAM API key
- Check Settings page
- Verify key is valid: https://open.gsa.gov/api/opportunities-api/

### Search Fails - Check Celery Worker logs
- Look for errors in Celery Worker window
- Check backend logs for SAM.gov API errors
