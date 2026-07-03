document.getElementById('contactForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector('.send-btn');
  const statusDiv = document.getElementById('formStatus');

  submitButton.disabled = true;
  submitButton.innerText = 'Sending...';
  
  if (statusDiv) {
    statusDiv.style.display = 'none';
    statusDiv.innerText = '';
  }

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const responseText = await response.text();
    let result = {};
    
    try {
      if (responseText) {
        result = JSON.parse(responseText);
      }
    } catch (e) {
      // Safely ignore parsing errors if the server sends plain text
    }

    if (response.ok) {
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.style.color = '#16a34a';
        statusDiv.innerText = 'Thank you! Your message has been sent successfully.';
      }
      form.reset();
    } else {
      throw new Error(result.message || 'Something went wrong on the server.');
    }
  } catch (error) {
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.style.color = '#dc2626';
      statusDiv.innerText = error.message || 'Failed to connect to the server. Please try again later.';
    }
  } finally {
    submitButton.disabled = false;
    submitButton.innerText = 'Send Inquiry →';
  }
});