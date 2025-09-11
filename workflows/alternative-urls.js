// Add this as a Code node before your HTTP Request to generate alternative URLs
// This tries multiple possible URL patterns for each document

const inputData = $input.all()[0].json;
const documentId = inputData.documentId;

// Generate multiple possible URLs to try
const alternativeUrls = [
  `https://downloads.regulations.gov/${documentId}/content.pdf`,
  `https://downloads.regulations.gov/${documentId}/content.html`,
  `https://www.regulations.gov/contentStreamer?documentId=${documentId}&attachmentNumber=1&contentType=pdf`,
  `https://api.regulations.gov/v4/documents/${documentId}/content`,
  `https://downloads.regulations.gov/${documentId}/attachment_1.pdf`
];

// Return the original data with additional URL options
return {
  ...inputData,
  primaryPdfUrl: alternativeUrls[0],
  alternativeUrls: alternativeUrls,
  currentUrlIndex: 0
};
