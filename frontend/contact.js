document.getElementById('contactForm').addEventListener('submit', async (event) => {
  event.preventDefault(); // Stop page from refreshing

  const submitButton = event.target.querySelector('.send-btn');
  submitButton.disabled = true;
  submitButton.innerText = 'Sending...';

  // Extract values from form fields dynamically matching your HTML input 'name' fields
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert('Thank you! Your message has been sent.');
      event.target.reset(); // Clear the form
    } else {
      const errorData = await response.json();
      alert(`Error: ${errorData.message || 'Something went wrong.'}`);
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Failed to connect to the server. Please try again later.');
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = 'Send Inquiry →';
  }
});