console.log("🎯 BOOM! The HTML file is successfully talking to contact.js!");

console.log({
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS_EXISTS: !!process.env.EMAIL_PASS,
});
document.getElementById('contactForm').addEventListener('submit', async (event) => {
  event.preventDefault(); // Stop page from refreshing
  console.log("🚀 Form submit event triggered!");

  const submitButton = event.target.querySelector('.send-btn');
  submitButton.disabled = true;
  submitButton.innerText = 'Sending...';

  // Extract values from form fields
  const formData = new FormData(event.target);
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

    if (response.ok) {
      console.log("✅ Email sent successfully according to the server.");
      alert('Thank you! Your message has been sent.');
      event.target.reset(); // Clear the form
    } else {
      const errorData = await response.json();
      console.error("❌ Server rejected the request. Error payload:", errorData);
      alert(`Error: ${errorData.message || 'Something went wrong.'}`);
    }
  } catch (error) {
    console.error('💥 Critical error during fetch operation:', error);
    alert('Failed to connect to the server. Please try again later.');
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = 'Send Inquiry →';
    console.log("🔄 Form submission loop finalized.");
  }
});