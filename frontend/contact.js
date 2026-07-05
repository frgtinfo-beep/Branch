document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop the page from refreshing

    const statusDiv = document.getElementById('formStatus');
    const submitBtn = document.querySelector('.send-btn');
    
    // Show loading state
    statusDiv.style.display = 'block';
    statusDiv.style.color = '#1f2937'; 
    statusDiv.innerText = "Sending your message...";
    submitBtn.disabled = true;

    // Get all form data
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        company: document.getElementById('company').value,
        projectType: document.getElementById('projectType').value,
        budget: document.getElementById('budget').value,
        message: document.getElementById('message').value
    };

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            statusDiv.innerText = "Success! We will get back to you within 24 hours.";
            statusDiv.style.color = "#16a34a"; 
            document.getElementById('contactForm').reset();
        } else {
            const errorData = await response.json();
            statusDiv.innerText = errorData.message || "Failed to send message. Please try again.";
            statusDiv.style.color = "#dc2626"; 
        }
    } catch (error) {
        statusDiv.innerText = "A network error occurred. Please check your connection.";
        statusDiv.style.color = "#dc2626";
    } finally {
        submitBtn.disabled = false;
    }
});