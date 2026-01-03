// Mobile navigation toggle
const navToggle = document.querySelector('.nav-toggle');

if (navToggle) {
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        // Could add mobile menu here
    });
}

// Product slider scroll
function scrollProducts(sliderId, direction) {
    const slider = document.getElementById(sliderId);
    if (slider) {
        const scrollAmount = 240 * direction;
        slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

// Search functionality
const searchInput = document.querySelector('.nav-search input');
if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                window.location.href = `/explore?search=${encodeURIComponent(query)}`;
            }
        }
    });
}

// Fetch products from API
async function fetchProducts(options = {}) {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.search) params.append('search', options.search);
    if (options.type) params.append('type', options.type);
    
    try {
        const response = await fetch(`/api/products?${params}`);
        const data = await response.json();
        return data.products;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

// Fetch single product
async function fetchProduct(id) {
    try {
        const response = await fetch(`/api/products/${id}`);
        const data = await response.json();
        return data.product;
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

// Fetch collections
async function fetchCollections() {
    try {
        const response = await fetch('/api/collections');
        const data = await response.json();
        return data.collections;
    } catch (error) {
        console.error('Error fetching collections:', error);
        return [];
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Add stagger animation to product cards
    document.querySelectorAll('.product-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.05}s`;
    });
    
    // Wishlist button functionality
    document.querySelectorAll('.btn-wishlist').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.toggle('active');
            const icon = this.querySelector('svg');
            if (this.classList.contains('active')) {
                icon.setAttribute('fill', 'currentColor');
            } else {
                icon.setAttribute('fill', 'none');
            }
        });
    });
});

// Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}
