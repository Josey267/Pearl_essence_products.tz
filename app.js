document.addEventListener('DOMContentLoaded', function() {
    // Select all necessary HTML elements
    const deliveryModal = document.getElementById('deliveryModal');
    const modalClose = document.getElementById('modalClose');
    const nextToStep2 = document.getElementById('nextToStep2');
    const backToStep1 = document.getElementById('backToStep1');
    const nextToStep3 = document.getElementById('nextToStep3');
    const finishBtn = document.getElementById('finishBtn');

    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step1Content = document.getElementById('step1-content');
    const step2Content = document.getElementById('step2-content');
    const step3Content = document.getElementById('step3-content');
    const stepLines = document.querySelectorAll('.step-line');

    const locationSelect = document.getElementById('location');
    const agentList = document.getElementById('agentList');
    const confirmationText = document.getElementById('confirmationText');

    // Variables to store selected product and agent data
    let currentProduct = null;
    let selectedAgent = null;

    // Agent data for Dar es Salaam districts
   

    // Event listener for all "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            // Get product info from data attributes
            const productName = this.getAttribute('data-product');
            const productPrice = parseFloat(this.getAttribute('data-price'));
            currentProduct = { name: productName, price: productPrice };
            
            // Show the delivery modal
            deliveryModal.classList.add('active');
        });
    });

    // Close modal event
    modalClose.addEventListener('click', () => {
        deliveryModal.classList.remove('active');
        resetModal();
    });

    // Step 1 to Step 2 navigation
    nextToStep2.addEventListener('click', () => {
        if (!locationSelect.value) {
            alert("Please select a location.");
            return;
        }
        step1.classList.remove('active');
        step1.classList.add('completed');
        step2.classList.add('active');
        stepLines[0].classList.add('completed');
        
        step1Content.style.display = 'none';
        step2Content.style.display = 'block';

        const selectedLocation = locationSelect.value;
        renderAgents(selectedLocation);
    });

    // Step 2 to Step 1 navigation
    backToStep1.addEventListener('click', () => {
        step1.classList.add('active');
        step1.classList.remove('completed');
        step2.classList.remove('active');
        stepLines[0].classList.remove('completed');
        
        step1Content.style.display = 'block';
        step2Content.style.display = 'none';
        
        // Disable next button for step 2 again
        nextToStep3.disabled = true;
    });

    // Step 2 to Step 3 navigation
    nextToStep3.addEventListener('click', () => {
        if (!selectedAgent) {
            alert("Please select a delivery partner.");
            return;
        }

        step2.classList.remove('active');
        step2.classList.add('completed');
        step3.classList.add('active');
        stepLines[1].classList.add('completed');
        
        step2Content.style.display = 'none';
        step3Content.style.display = 'block';

        confirmationText.textContent = `${currentProduct.name} ($${currentProduct.price}) has been added to your cart.`;
        
        // Store selected agent and product in local storage for the next page
        localStorage.setItem('selectedAgent', JSON.stringify(selectedAgent));
        localStorage.setItem('currentProduct', JSON.stringify(currentProduct));
    });

    // New logic for the Finish button
    finishBtn.addEventListener('click', () => {
        // Redirect to the agents and community page
        window.location.href = 'agents&Community.html';
    });

    // Handle location selection to enable the next button
    locationSelect.addEventListener('change', () => {
        nextToStep2.disabled = !locationSelect.value;
    });

    // Function to render agent cards based on location
    function renderAgents(location) {
        agentList.innerHTML = '';
        const agents = agentsByLocation[location] || [];

        if (agents.length === 0) {
            agentList.innerHTML = '<p class="no-agents-message">No agents found for this location.</p>';
            return;
        }

        agents.forEach(agent => {
            const agentCard = document.createElement('div');
            agentCard.className = 'agent-card';
            if (!agent.available) {
                agentCard.classList.add('unavailable');
            }

            const availabilityClass = agent.available ? 'available' : 'unavailable';
            const availabilityText = agent.available ? 'Available' : 'Busy';

            agentCard.innerHTML = `
                <div class="agent-avatar">${agent.avatar}</div>
                <div class="agent-details">
                    <p class="agent-name">${agent.name}</p>
                    <p class="agent-info">${agent.distance} away &bull; Rating: <span class="agent-rating">${agent.rating} <i class="fas fa-star"></i></span></p>
                </div>
                <span class="agent-availability ${availabilityClass}">${availabilityText}</span>
            `;

            // Add click listener to select an agent
            if (agent.available) {
                agentCard.addEventListener('click', function() {
                    // Remove 'selected' class from all other cards
                    document.querySelectorAll('.agent-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    // Add 'selected' class to the clicked card
                    this.classList.add('selected');
                    selectedAgent = agent;
                    nextToStep3.disabled = false;
                });
            }

            agentList.appendChild(agentCard);
        });
    }

    // Function to fully reset the modal to its initial state
    function resetModal() {
        resetModalSteps();
        locationSelect.value = '';
        selectedAgent = null;
        currentProduct = null;
    }

    // Function to reset only the visual steps and temporary data
    function resetModalSteps() {
        step1.classList.add('active');
        step1.classList.remove('completed');
        step2.classList.remove('active');
        step2.classList.remove('completed');
        step3.classList.remove('active');
        step3.classList.remove('completed');

        stepLines[0].classList.remove('completed');
        stepLines[1].classList.remove('completed');

        step1Content.style.display = 'block';
        step2Content.style.display = 'none';
        step3Content.style.display = 'none';

        agentList.innerHTML = '';
        nextToStep2.disabled = true; // Ensure the Next button is disabled at the start
        nextToStep3.disabled = true;
        selectedAgent = null; // Important to reset the selected agent
    }
});
