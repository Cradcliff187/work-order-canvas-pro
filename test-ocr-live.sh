#!/bin/bash
# OCR Function Live Test Script

echo "🔬 Testing Refactored OCR Function with Phase 2 Enhancements"
echo "=============================================================="

# Get project URL (replace with your project URL)
PROJECT_URL="https://inudoymofztrvxhrlrek.supabase.co"

echo "Testing Home Depot Sample..."
curl -X POST "$PROJECT_URL/functions/v1/process-receipt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{
    "testMode": true,
    "testDocument": "home_depot"
  }' | jq '.'

echo ""
echo "Testing Lowe's Sample..."
curl -X POST "$PROJECT_URL/functions/v1/process-receipt" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{
    "testMode": true,
    "testDocument": "lowes"
  }' | jq '.'

echo ""
echo "✅ OCR Function Live Tests Complete"
echo "Expected Results:"
echo "- Home Depot: vendor='Home Depot', total=57.00, 4 line items"
echo "- Lowe's: vendor='Lowes', total=60.94, 4 line items"