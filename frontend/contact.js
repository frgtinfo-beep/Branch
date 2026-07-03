document.getElementById('contactForm').addEventListener('submit', async (event) => {
  event.preventDefault(); // Stop page from refreshing
  console.log("🚀 Form submit event triggered!");

  const form = event.target;
  const submitButton = form.querySelector('.send-btn');
  const statusDiv = document.getElementById('formStatus');

  // UI Loading State
  submitButton.disabled = true;
  submitButton.innerText = 'Sending...';
  
  if (statusDiv) {
    statusDiv.style.display = 'none';
    statusDiv.innerText = '';
  }

  // Extract values from form fields
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  console.log("📦 Form Data Collected:", data);

  try {
    console.log("📡 Attempting to send fetch request to /api/contact...");
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log("📥 Server responded with status code:", response.status);
    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ Email sent successfully according to the server.");
      
      // Show integrated success message
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.style.color = '#16a34a'; // Beautiful green
        statusDiv.innerText = 'Thank you! Your message has been sent successfully.';
      }
      form.reset(); // Clear the form
    } else {
      console.error("❌ Server rejected the request. Error payload:", result);
      throw new Error(result.message || 'Something went wrong on the server.');
    }
  } catch (error) {
    console.error('💥 Error during fetch operation:', error);
    
    // Show integrated error message
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.style.color = '#dc2626'; // Alert red
      statusDiv.innerText = error.message || 'Failed to connect to the server. Please try again later.';
    }
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = 'Send Inquiry →';
    console.log("🔄 Form submission loop finalized.");
  }
});