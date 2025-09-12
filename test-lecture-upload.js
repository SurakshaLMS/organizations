/**
 * LECTURE DOCUMENT UPLOAD TEST SCRIPT
 * 
 * This script tests the lecture document upload functionality
 * and helps debug any issues with file uploads.
 */

const BASE_URL = 'http://localhost:3000/organization/api/v1';
const JWT_TOKEN = 'your-jwt-token-here'; // Replace with actual token

/**
 * Test creating a lecture with document uploads
 */
async function testLectureWithDocuments() {
  console.log('🧪 Testing: Create Lecture with Documents');
  
  // Create form data
  const formData = new FormData();
  formData.append('causeId', '1'); // String format required
  formData.append('title', 'Test Lecture with Documents');
  formData.append('description', 'Testing document upload functionality');
  formData.append('content', 'This is the lecture content for testing document uploads');
  formData.append('isPublic', 'false');
  
  // For browser environment with file input
  if (typeof window !== 'undefined') {
    const fileInput = document.getElementById('fileInput');
    if (fileInput && fileInput.files.length > 0) {
      for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('documents', fileInput.files[i]);
      }
      console.log(`📎 Uploading ${fileInput.files.length} files`);
    } else {
      console.log('⚠️ No files selected. Add files using <input type="file" id="fileInput" multiple>');
    }
  }
  
  try {
    console.log('📤 Sending request to:', `${BASE_URL}/lectures/with-files`);
    
    const response = await fetch(`${BASE_URL}/lectures/with-files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
        // Don't set Content-Type for FormData - browser sets it automatically
      },
      body: formData
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
      
      // Analyze the response
      console.log('\n📊 Upload Analysis:');
      console.log(`Lecture ID: ${result.lectureId}`);
      console.log(`Title: ${result.title}`);
      console.log(`Documents uploaded: ${result.documents?.length || 0}`);
      
      if (result.documents && result.documents.length > 0) {
        console.log('\n📄 Document Details:');
        result.documents.forEach((doc, index) => {
          console.log(`${index + 1}. ${doc.title}`);
          console.log(`   URL: ${doc.docUrl}`);
          console.log(`   Size: ${doc.fileSize} bytes`);
          console.log(`   Documentation ID: ${doc.documentationId}`);
        });
      } else {
        console.log('❌ No documents found in response!');
        console.log('This indicates the upload failed or files were not processed.');
      }
      
      return result;
    } else {
      console.log('❌ Error:', result);
      
      // Analyze the error
      if (result.message && Array.isArray(result.message)) {
        console.log('\n🔍 Validation Errors:');
        result.message.forEach(msg => console.log(`   - ${msg}`));
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
    return null;
  }
}

/**
 * Test getting lecture documents
 */
async function testGetLectureDocuments(lectureId) {
  console.log(`🧪 Testing: Get Lecture Documents (${lectureId})`);
  
  try {
    const response = await fetch(`${BASE_URL}/lectures/${lectureId}/documents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
      return result;
    } else {
      console.log('❌ Error:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
    return null;
  }
}

/**
 * Create a simple test file for upload (browser only)
 */
function createTestFile() {
  if (typeof window === 'undefined') {
    console.log('❌ File creation only available in browser environment');
    return null;
  }
  
  // Create a simple text file for testing
  const content = 'This is a test document for lecture upload functionality.';
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], 'test-document.txt', { type: 'text/plain' });
  
  return file;
}

/**
 * Full test suite
 */
async function runLectureUploadTests() {
  console.log('🚀 Starting Lecture Document Upload Tests\n');
  
  // Test 1: Create lecture with documents
  const createdLecture = await testLectureWithDocuments();
  console.log('\n---\n');
  
  // Test 2: Get lecture documents (if lecture was created)
  if (createdLecture && createdLecture.lectureId) {
    await testGetLectureDocuments(createdLecture.lectureId);
  }
  
  console.log('\n🏁 Tests completed!');
  
  // Provide debugging tips if no documents were uploaded
  if (createdLecture && (!createdLecture.documents || createdLecture.documents.length === 0)) {
    console.log('\n🔧 Debugging Tips:');
    console.log('1. Check that files are selected in the file input');
    console.log('2. Verify JWT token is valid');
    console.log('3. Check server logs for GCS upload errors');
    console.log('4. Ensure GCS configuration is correct');
    console.log('5. Verify causeId exists in the database');
  }
}

/**
 * Browser-specific functionality
 */
if (typeof window !== 'undefined') {
  // Create file input for testing
  const createFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'fileInput';
    input.multiple = true;
    input.accept = '.pdf,.docx,.txt,.png,.jpg';
    input.onchange = () => {
      console.log(`📎 ${input.files.length} files selected`);
    };
    
    if (!document.getElementById('fileInput')) {
      document.body.appendChild(input);
    }
  };
  
  // Auto-create file input if not exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFileInput);
  } else {
    createFileInput();
  }
  
  console.log('📋 Lecture Upload Test Script Loaded');
  console.log('1. Select files using the file input');
  console.log('2. Update JWT_TOKEN variable');
  console.log('3. Run: runLectureUploadTests()');
}

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testLectureWithDocuments,
    testGetLectureDocuments,
    runLectureUploadTests
  };
}

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. In Browser:
 *    - Open this script in browser console
 *    - Update JWT_TOKEN with your actual token
 *    - Select files using the file input that appears
 *    - Run: runLectureUploadTests()
 * 
 * 2. Expected Results:
 *    - Lecture created with non-null documents array
 *    - Each document has a valid docUrl
 *    - Files accessible via returned URLs
 * 
 * 3. If Upload Fails:
 *    - Check server logs for detailed error messages
 *    - Verify GCS configuration in .env file
 *    - Ensure causeId exists in database
 *    - Check file sizes and formats
 */