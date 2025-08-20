
    // Modernizr-like feature detection
    document.documentElement.className = document.documentElement.className.replace('no-js', 'js');

    // Page transition animation
    const pageTransition = document.getElementById('pageTransition');
    
    // Show main content with transition when Shop Now is clicked
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mainContent = document.getElementById('mainContent');
    const shopNowBtn = document.getElementById('shopNowBtn');
    const backBtn = document.getElementById('backBtn');
    const welcomeBgImage = document.getElementById('welcomeBgImage');
    const homeLink = document.getElementById('homeLink');
    const contactLink = document.getElementById('contactLink');
    const agentsLink = document.getElementById('agentsLink');
    const locationLink = document.getElementById('locationLink');
    const locationModal = document.getElementById('locationModal');
    const closeModal = document.getElementById('closeModal');
    const applyNowBtn = document.getElementById('applyNowBtn');
    
    // Replace this with your actual image URL
    welcomeBgImage.style.backgroundImage = "url('images/image A (6).jpg')";
    
    // Navigation functionality
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (mainContent.style.display === 'block') {
        // Start reverse transition
        mainContent.style.opacity = '0';
        pageTransition.style.transform = 'scaleY(1)';
        pageTransition.style.transformOrigin = 'top';
        pageTransition.style.transition = 'transform 0.6s cubic-bezier(0.65, 0, 0.35, 1)';
        
        setTimeout(() => {
          mainContent.style.display = 'none';
          welcomeScreen.style.display = 'flex';
          
          // Reset transition
          setTimeout(() => {
            pageTransition.style.transform = 'scaleY(0)';
            pageTransition.style.transformOrigin = 'bottom';
          }, 50);
        }, 600);
        
        window.scrollTo(0, 0);
      }
    });
    
    contactLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    });
    
    
    
    locationLink.addEventListener('click', (e) => {
      e.preventDefault();
      locationModal.style.display = 'flex';
      trackCarouselInteraction('location_modal_open');
    });
    
    closeModal.addEventListener('click', () => {
      locationModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
      if (e.target === locationModal) {
        locationModal.style.display = 'none';
      }
    });
    
    shopNowBtn.addEventListener('click', () => {
      // Start transition animation
      pageTransition.style.transform = 'scaleY(1)';
      pageTransition.style.transformOrigin = 'bottom';
      pageTransition.style.transition = 'transform 0.6s cubic-bezier(0.65, 0, 0.35, 1)';
      
      setTimeout(() => {
        welcomeScreen.style.display = 'none';
        mainContent.style.display = 'block';
        backBtn.style.display = 'block';
        
        // Reset transition for next use
        setTimeout(() => {
          pageTransition.style.transform = 'scaleY(0)';
          pageTransition.style.transformOrigin = 'top';
          
          // Fade in main content
          setTimeout(() => {
            mainContent.style.opacity = '1';
          }, 100);
        }, 50);
      }, 600);
    });
    
    backBtn.addEventListener('click', () => {
      // Start reverse transition
      mainContent.style.opacity = '0';
      pageTransition.style.transform = 'scaleY(1)';
      pageTransition.style.transformOrigin = 'top';
      pageTransition.style.transition = 'transform 0.6s cubic-bezier(0.65, 0, 0.35, 1)';
      
      setTimeout(() => {
        mainContent.style.display = 'none';
        welcomeScreen.style.display = 'flex';
        backBtn.style.display = 'none';
        
        // Reset transition
        setTimeout(() => {
          pageTransition.style.transform = 'scaleY(0)';
          pageTransition.style.transformOrigin = 'bottom';
        }, 50);
      }, 600);
      
      window.scrollTo(0, 0);
    });
    
    // Apply Now button functionality
    applyNowBtn.addEventListener('click', () => {
      alert("Thank you for your interest in becoming a Pearl Essence agent! Our team will contact you shortly.");
    });
    
    // Theme Toggle Functionality
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    themeToggle.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      // Save preference to localStorage
      const isDarkMode = body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', isDarkMode);
    });
    
    // Check for saved theme preference
    if (localStorage.getItem('darkMode') === 'true') {
      body.classList.add('dark-mode');
    }
    
    // Product Scroller Functionality
    function scrollProducts(offset) {
      const scroller = document.getElementById('productScroller');
      scroller.scrollBy({
        left: offset,
        behavior: 'smooth'
      });
    }
    
    // Auto-hide arrows when at scroll boundaries
    const scroller = document.getElementById('productScroller');
    const leftArrow = document.querySelector('.arrow-left');
    const rightArrow = document.querySelector('.arrow-right');
    
    scroller.addEventListener('scroll', () => {
      leftArrow.style.display = scroller.scrollLeft > 0 ? 'flex' : 'none';
      rightArrow.style.display = scroller.scrollLeft < (scroller.scrollWidth - scroller.clientWidth) ? 'flex' : 'none';
    });
    
    // Initialize arrow visibility
    leftArrow.style.display = 'none';
    
    // Add ripple effect to buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const x = e.clientX - e.target.getBoundingClientRect().left;
        const y = e.clientY - e.target.getBoundingClientRect().top;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        this.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 1000);
      });
    });
    
    // Auto return to welcome screen on scroll down
    mainContent.addEventListener('scroll', () => {
      if (mainContent.scrollTop > 30) {
        mainContent.style.opacity = '0';
        pageTransition.style.transform = 'scaleY(1)';
        pageTransition.style.transformOrigin = 'top';
        pageTransition.style.transition = 'transform 0.6s cubic-bezier(0.65, 0, 0.35, 1)';
        setTimeout(() => {
          mainContent.style.display = 'none';
          welcomeScreen.style.display = 'flex';
          backBtn.style.display = 'none';
          setTimeout(() => {
            pageTransition.style.transform = 'scaleY(0)';
            pageTransition.style.transformOrigin = 'bottom';
          }, 50);
        }, 600);
        window.scrollTo(0, 0);
      }
    });

    // Image Carousel Functionality
    const carouselTrack = document.getElementById('carouselTrack');
    const carouselNav = document.getElementById('carouselNav');
    const slides = document.querySelectorAll('.carousel-slide');
    const slideCount = slides.length;
    let currentIndex = 0;
    let interval;
    let touchStartX = 0;
    let touchEndX = 0;

    // Create navigation indicators
    slides.forEach((slide, index) => {
      const indicator = document.createElement('div');
      indicator.className = 'carousel-indicator';
      if (index === 0) indicator.classList.add('active');
      indicator.addEventListener('click', () => {
        goToSlide(index);
        trackCarouselInteraction('indicator_click');
      });
      carouselNav.appendChild(indicator);
      
      // Set ARIA attributes
      slide.setAttribute('aria-hidden', index !== 0);
      slide.querySelector('.slide-content').setAttribute('aria-live', index === 0 ? 'polite' : 'off');
    });

    // Start auto-play
    function startCarousel() {
      interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % slideCount;
        updateCarousel();
        trackCarouselInteraction('auto_advance');
      }, 5000); // Change slide every 5 seconds
    }

    // Update carousel position and active indicator
    function updateCarousel() {
      carouselTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
      
      // Update active indicator and ARIA attributes
      document.querySelectorAll('.carousel-indicator').forEach((indicator, index) => {
        if (index === currentIndex) {
          indicator.classList.add('active');
          slides[index].setAttribute('aria-hidden', 'false');
          slides[index].querySelector('.slide-content').setAttribute('aria-live', 'polite');
        } else {
          indicator.classList.remove('active');
          slides[index].setAttribute('aria-hidden', 'true');
          slides[index].querySelector('.slide-content').setAttribute('aria-live', 'off');
        }
      });
    }

    // Go to specific slide
    function goToSlide(index) {
      currentIndex = index;
      updateCarousel();
      resetInterval();
    }

    // Navigate to next slide
    function nextSlide() {
      currentIndex = (currentIndex + 1) % slideCount;
      updateCarousel();
      resetInterval();
      trackCarouselInteraction('next_slide');
    }

    // Navigate to previous slide
    function prevSlide() {
      currentIndex = (currentIndex - 1 + slideCount) % slideCount;
      updateCarousel();
      resetInterval();
      trackCarouselInteraction('prev_slide');
    }

    // Reset interval when manually navigating
    function resetInterval() {
      clearInterval(interval);
      startCarousel();
    }

    // Handle swipe gestures for touch devices
    carouselTrack.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});

    carouselTrack.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, {passive: true});

    function handleSwipe() {
      if (touchEndX < touchStartX - 50) nextSlide();
      if (touchEndX > touchStartX + 50) prevSlide();
    }

    // Pause on hover
    carouselTrack.addEventListener('mouseenter', () => clearInterval(interval));
    carouselTrack.addEventListener('mouseleave', startCarousel);

    // Track carousel interactions
    function trackCarouselInteraction(action) {
      if (window.gtag) {
        gtag('event', 'carousel_interaction', {
          'event_category': 'engagement',
          'event_label': action
        });
      }
    }

    // Initialize carousel
    startCarousel();

    // Product Showcase Read More functionality
    document.querySelectorAll('.showcase-readmore').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const item = btn.closest('.showcase-item');
        item.classList.toggle('expanded');
        btn.textContent = item.classList.contains('expanded') ? 'Show Less' : 'Read More';
      });
    });

    // Show back button when scrolled down in main content
    mainContent.addEventListener('scroll', function() {
      if (this.scrollTop > 100) {
        backBtn.style.opacity = '1';
        backBtn.style.pointerEvents = 'auto';
      } else {
        backBtn.style.opacity = '0';
        backBtn.style.pointerEvents = 'none';
      }
    });
   // You can add interactive functionality here if needed
document.addEventListener('DOMContentLoaded', function() {
  // Example: Add click tracking for analytics
  const buttons = document.querySelectorAll('.shop-btn');
  
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      console.log('Product button clicked:', e.target.textContent.trim());
      // Add your analytics tracking here
    });
  });
  
  console.log('Pearl Essence products loaded');
});