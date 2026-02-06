"""
Comprehensive test for SAM.gov search and filtering flow.
Tests: Profile creation → Search → Results → Filtering
"""
import asyncio
import sys
import time
from datetime import datetime, timedelta
import httpx

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "TestPassword123!"

class SearchFlowTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.token = None
        self.user_id = None
        self.profile_id = None
        self.search_id = None
        self.job_id = None
        
    async def cleanup(self):
        await self.client.aclose()
    
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        colors = {"INFO": "\033[94m", "SUCCESS": "\033[92m", "ERROR": "\033[91m", "WARN": "\033[93m"}
        reset = "\033[0m"
        print(f"[{timestamp}] {colors.get(level, '')}{level}{reset}: {message}")
    
    async def register_or_login(self):
        """Register new user or login if exists."""
        self.log("Attempting to register test user...")
        
        try:
            # Try to register
            response = await self.client.post(
                f"{BASE_URL}/auth/register",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
            )
            if response.status_code == 201:
                self.log("✓ User registered successfully", "SUCCESS")
        except Exception:
            self.log("User already exists, logging in...", "WARN")
        
        # Login
        response = await self.client.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if response.status_code != 200:
            self.log(f"Login failed: {response.text}", "ERROR")
            return False
        
        data = response.json()
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]
        self.log(f"✓ Logged in successfully (User ID: {self.user_id})", "SUCCESS")
        return True
    
    async def create_test_profile(self):
        """Create a test company profile."""
        self.log("Creating test company profile...")
        
        profile_data = {
            "company_name": "Test Cloud Solutions LLC",
            "primary_naics": "541511",
            "secondary_naics": ["541512", "518210"],
            "core_competencies": ["Cloud Migration", "DevOps", "Cybersecurity"],
            "technical_skills": ["AWS", "Azure", "Kubernetes", "Python"],
            "certifications": ["Small Business"],
            "service_area": ["VA", "MD"],
            "target_contract_min": 50000,
            "target_contract_max": 5000000,
            "blacklist_keywords": ["weapons", "classified"],
            "past_performance_keywords": ["cloud migration", "modernization", "IT infrastructure"],
            "priority_keywords": ["cloud", "cybersecurity", "DevOps"],
            "clearance_level": "Secret",
            "contract_types_preference": ["FFP", "IDIQ"],
            "open_to_subcontracting": True,
            "open_to_prime_contracting": True,
            "cage_code": "",
            "uei_number": "",
            "duns_number": ""
        }
        
        response = await self.client.put(
            f"{BASE_URL}/profile",
            json=profile_data,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if response.status_code not in [200, 201]:
            self.log(f"Profile creation failed: {response.text}", "ERROR")
            return False
        
        profile = response.json()
        self.profile_id = profile["id"]
        self.log(f"✓ Profile created (ID: {self.profile_id})", "SUCCESS")
        self.log(f"  - Primary NAICS: {profile['primary_naics']}")
        self.log(f"  - Priority Keywords: {', '.join(profile['priority_keywords'])}")
        self.log(f"  - Clearance Level: {profile['clearance_level']}")
        return True
    
    async def start_search(self):
        """Start a SAM.gov search."""
        self.log("Starting SAM.gov search (30 days back)...")
        
        response = await self.client.post(
            f"{BASE_URL}/search/start",
            json={"days_back": 30},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if response.status_code != 202:
            self.log(f"Search start failed: {response.text}", "ERROR")
            return False
        
        data = response.json()
        self.job_id = data["job_id"]
        self.search_id = data["search_id"]
        self.log(f"✓ Search started", "SUCCESS")
        self.log(f"  - Job ID: {self.job_id}")
        self.log(f"  - Search ID: {self.search_id}")
        return True
    
    async def poll_job_status(self, max_wait=120):
        """Poll job status until complete or failed."""
        self.log(f"Polling job status (max wait: {max_wait}s)...")
        
        start_time = time.time()
        last_status = None
        
        while time.time() - start_time < max_wait:
            response = await self.client.get(
                f"{BASE_URL}/jobs/{self.job_id}/status",
                headers={"Authorization": f"Bearer {self.token}"}
            )
            
            if response.status_code != 200:
                self.log(f"Status check failed: {response.text}", "ERROR")
                return None
            
            status_data = response.json()
            status = status_data["status"]
            
            if status != last_status:
                self.log(f"  Status: {status} (progress: {status_data.get('progress', 0)}%)")
                last_status = status
            
            if status == "complete":
                self.log("✓ Search completed successfully!", "SUCCESS")
                return status_data
            
            if status == "failed":
                error = status_data.get("error", "Unknown error")
                self.log(f"Search failed: {error}", "ERROR")
                return status_data
            
            await asyncio.sleep(2)
        
        self.log(f"Search timed out after {max_wait}s", "ERROR")
        return None
    
    async def get_search_results(self):
        """Retrieve cached search results."""
        self.log("Retrieving search results...")
        
        response = await self.client.get(
            f"{BASE_URL}/search/history/{self.search_id}",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        if response.status_code != 200:
            self.log(f"Failed to get results: {response.text}", "ERROR")
            return None
        
        data = response.json()
        results = data.get("cached_results", {})
        opportunities = results.get("opportunities", [])
        
        self.log(f"✓ Retrieved results", "SUCCESS")
        self.log(f"  - Total records: {data.get('total_results', 0)}")
        self.log(f"  - High relevance: {data.get('high_relevance_count', 0)}")
        self.log(f"  - Medium relevance: {data.get('medium_relevance_count', 0)}")
        self.log(f"  - Low relevance: {data.get('low_relevance_count', 0)}")
        self.log(f"  - Cached opportunities: {len(opportunities)}")
        
        return opportunities
    
    def test_filtering(self, opportunities):
        """Test client-side filtering on results."""
        self.log("\n" + "="*60)
        self.log("TESTING POST-SEARCH FILTERING", "INFO")
        self.log("="*60)
        
        if not opportunities:
            self.log("No opportunities to filter", "WARN")
            return
        
        # Test 1: Filter by relevance score
        self.log("\n[Test 1] Filter by relevance score >= 70")
        high_relevance = [
            opp for opp in opportunities 
            if opp.get("score", {}).get("relevance", 0) >= 70
        ]
        self.log(f"  Result: {len(high_relevance)}/{len(opportunities)} opportunities")
        if high_relevance:
            sample = high_relevance[0]
            self.log(f"  Sample: {sample.get('title', 'N/A')[:60]}...")
            self.log(f"    Score: {sample.get('score', {}).get('relevance', 0)}")
        
        # Test 2: Filter by recommendation
        self.log("\n[Test 2] Filter by recommendation = 'bid'")
        bid_opps = [
            opp for opp in opportunities 
            if opp.get("score", {}).get("recommendation") == "bid"
        ]
        self.log(f"  Result: {len(bid_opps)}/{len(opportunities)} opportunities")
        
        # Test 3: Filter by NAICS code
        self.log("\n[Test 3] Filter by NAICS code = '541511'")
        naics_match = [
            opp for opp in opportunities 
            if opp.get("naicsCode") == "541511"
        ]
        self.log(f"  Result: {len(naics_match)}/{len(opportunities)} opportunities")
        
        # Test 4: Filter by set-aside
        self.log("\n[Test 4] Filter by set-aside (Small Business)")
        set_aside = [
            opp for opp in opportunities 
            if "Small Business" in (opp.get("typeOfSetAsideDescription") or "")
        ]
        self.log(f"  Result: {len(set_aside)}/{len(opportunities)} opportunities")
        
        # Test 5: Filter by keyword in title
        self.log("\n[Test 5] Filter by keyword 'cloud' in title")
        keyword_match = [
            opp for opp in opportunities 
            if "cloud" in (opp.get("title") or "").lower()
        ]
        self.log(f"  Result: {len(keyword_match)}/{len(opportunities)} opportunities")
        if keyword_match:
            for i, opp in enumerate(keyword_match[:3], 1):
                self.log(f"  {i}. {opp.get('title', 'N/A')[:80]}")
        
        # Test 6: Filter by response deadline
        self.log("\n[Test 6] Filter by response deadline within 30 days")
        now = datetime.now()
        deadline_30d = now + timedelta(days=30)
        upcoming = []
        for opp in opportunities:
            deadline_str = opp.get("responseDeadLine")
            if deadline_str:
                try:
                    deadline = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
                    if now <= deadline <= deadline_30d:
                        upcoming.append(opp)
                except:
                    pass
        self.log(f"  Result: {len(upcoming)}/{len(opportunities)} opportunities")
        
        # Test 7: Combined filters
        self.log("\n[Test 7] Combined: High score + bid recommendation + NAICS match")
        combined = [
            opp for opp in opportunities 
            if (opp.get("score", {}).get("relevance", 0) >= 70 and
                opp.get("score", {}).get("recommendation") == "bid" and
                opp.get("naicsCode") == "541511")
        ]
        self.log(f"  Result: {len(combined)}/{len(opportunities)} opportunities")
        
        self.log("\n✓ All filtering tests completed", "SUCCESS")
    
    async def run_full_test(self):
        """Run complete test flow."""
        self.log("="*60)
        self.log("STARTING COMPREHENSIVE SEARCH FLOW TEST", "INFO")
        self.log("="*60)
        
        try:
            # Step 1: Auth
            if not await self.register_or_login():
                return False
            
            # Step 2: Profile
            if not await self.create_test_profile():
                return False
            
            # Step 3: Search
            if not await self.start_search():
                return False
            
            # Step 4: Poll status
            status_result = await self.poll_job_status()
            if not status_result or status_result.get("status") != "complete":
                return False
            
            # Step 5: Get results
            opportunities = await self.get_search_results()
            if opportunities is None:
                return False
            
            # Step 6: Test filtering
            self.test_filtering(opportunities)
            
            self.log("\n" + "="*60)
            self.log("✓ ALL TESTS PASSED!", "SUCCESS")
            self.log("="*60)
            return True
            
        except Exception as e:
            self.log(f"Test failed with exception: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await self.cleanup()

async def main():
    print("\n" + "="*60)
    print("PRE-FLIGHT CHECKS")
    print("="*60)
    
    # Check if backend is running
    print("Checking if backend is running...")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BASE_URL.replace('/api/v1', '')}/health")
            if response.status_code == 200:
                print("✓ Backend is running")
            else:
                print("✗ Backend returned unexpected status")
                print("\nPlease start the backend:")
                print("  cd backend")
                print("  ..\\venv\\Scripts\\uvicorn.exe app.main:app --reload")
                sys.exit(1)
    except Exception as e:
        print(f"✗ Backend is not running: {e}")
        print("\nPlease start the services first:")
        print("  1. Run: .\\Start SamSearch.bat")
        print("  2. Or manually start backend + celery worker")
        sys.exit(1)
    
    # Check if Celery worker is needed
    print("\n⚠  IMPORTANT: Ensure Celery worker is running!")
    print("   Run: .\\start-celery.bat")
    print("   (Search will hang without it)\n")
    
    input("Press Enter to continue with tests...")
    
    tester = SearchFlowTester()
    success = await tester.run_full_test()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
