document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop the page from refreshing
    console.log("Form submission triggered.");

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

    console.log("Data collected from inputs:", formData);

    try {
        console.log("Sending POST request to /api/contact...");
        const response = await fetch('https://branchdb.onrender.com/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        console.log("Received server response status:", response.status);

        if (response.ok) {
            console.log("✅ Success! The email was sent. Resetting the form.");
            statusDiv.innerText = "Success! We will get back to you within 24 hours.";
            statusDiv.style.color = "#16a34a"; 
            document.getElementById('contactForm').reset();
        } else {
            const errorData = await response.json();
            console.error("❌ Server rejected the request. Error data:", errorData);
            
            // Looks for 'error' to match your backend
            statusDiv.innerText = errorData.error || errorData.message || "Failed to send message. Please try again.";
            statusDiv.style.color = "#dc2626"; 
        }
    } catch (error) {
        console.error("🚨 A network error occurred:", error);
        statusDiv.innerText = "A network error occurred. Please check your connection.";
        statusDiv.style.color = "#dc2626";
    } finally {
        console.log("Re-enabling the submit button.");
        submitBtn.disabled = false;
    }
});