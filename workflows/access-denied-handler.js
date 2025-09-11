// Add this as a new Code node after your "Get Pdf" HTTP Request node
// This will check for Access Denied responses and skip them

const inputData = $input.all()[0].json;

// Check if the response contains "Access Denied" or similar error messages
const responseText = inputData.data || inputData.body || '';
const isAccessDenied = responseText.includes('Access Denied') || 
                      responseText.includes('AccessDenied') ||
                      responseText.includes('403') ||
                      responseText.includes('Forbidden');

if (isAccessDenied) {
  // Skip this document - return null or empty to indicate it should be skipped
  console.log(`Skipping document ${inputData.documentId} due to access denied`);
  return null; // This will cause the workflow to skip to the next item
}

// If not access denied, return the original data for further processing
return inputData;
