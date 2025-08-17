// Quick test script for OCR function
const testData = {
  testMode: true,
  testDocument: "home_depot"
};

console.log("Testing OCR function with:", testData);

// This would be called via the browser or curl, testing the refactored modules
const expectedResults = {
  vendor: "Home Depot",
  total: 57.00,
  lineItems: [
    { description: "2X4 LUMBER 8FT", quantity: 4, unit_price: 6.47 },
    { description: "SCREWS DECK 2.5\"", quantity: 1, unit_price: 12.99 },
    { description: "DRILL BIT SET", quantity: 1, unit_price: 19.99 },
    { description: "SANDPAPER 220 GRIT", quantity: 2, unit_price: 4.25 }
  ]
};

console.log("Expected results:", expectedResults);