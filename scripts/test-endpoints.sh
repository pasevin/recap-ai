#!/bin/bash

echo "🧪 Testing Recap AI API Endpoints"
echo "================================="

BASE_URL="http://localhost:3000"

echo ""
echo "1. Testing /api/config GET endpoint:"
curl -X GET "$BASE_URL/api/config" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo ""
echo "2. Testing /api/summarize GET endpoint:"
curl -X GET "$BASE_URL/api/summarize?timeframe=1w&sources=github,linear&format=json" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo ""
echo "3. Testing /api/github GET endpoint:"
curl -X GET "$BASE_URL/api/github?timeframe=1w&format=json" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo ""
echo "4. Testing /api/linear GET endpoint:"
curl -X GET "$BASE_URL/api/linear?timeframe=1w&format=json" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo ""
echo "5. Testing /api/summarize POST endpoint:"
curl -X POST "$BASE_URL/api/summarize" \
  -H "Content-Type: application/json" \
  -d '{
    "timeframe": "1w",
    "sources": ["github", "linear"],
    "format": "summary"
  }' \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo ""
echo "6. Testing /api/config POST endpoint:"
curl -X POST "$BASE_URL/api/config" \
  -H "Content-Type: application/json" \
  -d '{
    "github": {
      "defaultRepo": "pasevin/recap-ai"
    }
  }' \
  | jq '.' 2>/dev/null || echo "Response received"

echo ""
echo ""
echo "✅ All endpoint tests completed!"