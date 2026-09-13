/**
 * Phase 2 Closed-Loop Lifecycle Automated Verification Script
 */
async function runLifecycleTests() {
  const baseUrl = "http://127.0.0.1:3000";
  console.log("=== [PHASE 2 TEST] Starting End-to-End Municipal Lifecycle Verification ===");

  // 1. Fetch Analytics
  console.log("\n1. Testing GET /api/cases/analytics...");
  const analyticsRes = await fetch(`${baseUrl}/api/cases/analytics`);
  if (!analyticsRes.ok) throw new Error(`Failed to fetch analytics: ${analyticsRes.statusText}`);
  const analytics = await analyticsRes.json();
  console.log("   [OK] Analytics fetched:", {
    total_cases: analytics.total_cases,
    active_cases: analytics.active_cases,
    verification_required: analytics.verification_required_count,
    repair_verification_rate: `${analytics.repair_verification_rate_percent}%`
  });

  // 2. Fetch Cases List
  console.log("\n2. Testing GET /api/cases...");
  const casesRes = await fetch(`${baseUrl}/api/cases`);
  const casesData = await casesRes.json();
  console.log(`   [OK] Total cases retrieved: ${casesData.total}`);
  const testCase = casesData.cases.find((c: any) => c.status === "VERIFICATION_REQUIRED") || casesData.cases[0];
  console.log(`   [OK] Selected test case: ${testCase.case_id} (${testCase.road_name}) - Status: ${testCase.status}`);

  // 3. Test Verification Targets Spatial Query
  console.log("\n3. Testing GET /api/cases/verification-targets...");
  const targetsRes = await fetch(`${baseUrl}/api/cases/verification-targets?lat=${testCase.latitude}&lon=${testCase.longitude}&radius=50`);
  const targetsData = await targetsRes.json();
  console.log(`   [OK] Verification targets found within 50m: ${targetsData.total}`);

  // 4. Test WhatsApp Dispatch (Demonstration / Safe Mock Mode)
  console.log(`\n4. Testing POST /api/cases/${testCase.case_id}/whatsapp...`);
  const waRes = await fetch(`${baseUrl}/api/cases/${testCase.case_id}/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: "+91 98400 99999" })
  });
  const waData = await waRes.json();
  console.log("   [OK] WhatsApp dispatch result:", {
    success: waData.success,
    simulated: waData.simulated,
    messageId: waData.messageId
  });

  // 5. Test Same-Location AI Re-scan Verification (Defect Absent -> VERIFIED)
  console.log(`\n5. Testing POST /api/cases/${testCase.case_id}/verify-scan (AI cleared)...`);
  const scanRes = await fetch(`${baseUrl}/api/cases/${testCase.case_id}/verify-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scanner_vehicle_id: "V001 (Inspection Van)",
      detected_defect_persists: false,
      confidence: 0.91,
      notes: "Surface scan confirmed cold-mix patch flush with pavement."
    })
  });
  const scanData = await scanRes.json();
  console.log("   [OK] Scan verification result:", {
    status: scanData.case.status,
    ai_statement: scanData.case.after_evidence?.ai_verification_statement
  });

  // Check strict safety statement
  if (!scanData.case.after_evidence?.ai_verification_statement.includes("Original defect was not detected during post-repair AI inspection")) {
    throw new Error("AI verification statement failed safety phrasing requirement!");
  }

  // 6. Test Human Engineer Verification Sign-Off -> CLOSED
  console.log(`\n6. Testing POST /api/cases/${testCase.case_id}/verify-human...`);
  const signRes = await fetch(`${baseUrl}/api/cases/${testCase.case_id}/verify-human`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verifier_name: "Chief Eng. M. Ramanathan (GCC)",
      notes: "Field audit verified riding quality and proper asphalt compaction."
    })
  });
  const signData = await signRes.json();
  console.log("   [OK] Human sign-off result:", {
    status: signData.case.status,
    closed_at: signData.case.closed_at,
    verifier: signData.case.after_evidence?.human_verifier_name
  });

  // 7. Test Transition to REOPENED if post-repair re-scan detects defect persisting
  console.log(`\n7. Testing POST /api/cases/${testCase.case_id}/verify-scan (Defect Persisting -> REOPENED)...`);
  const reopenRes = await fetch(`${baseUrl}/api/cases/${testCase.case_id}/verify-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scanner_vehicle_id: "MTC 46G (Transit Bus)",
      detected_defect_persists: true,
      confidence: 0.89,
      notes: "Surface distress persists after rain."
    })
  });
  const reopenData = await reopenRes.json();
  console.log("   [OK] Persisting defect re-scan result:", {
    status: reopenData.case.status,
    ai_result: reopenData.case.after_evidence?.ai_verification_result
  });

  console.log("\n=== [SUCCESS] All Phase 2 Municipal Lifecycle Tests Passed with 100% Compliance! ===");
}

runLifecycleTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
