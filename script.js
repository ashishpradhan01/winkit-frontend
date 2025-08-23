const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const themeToggle = document.getElementById("themeToggle");
const input = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");
const showOfferBtn = document.getElementById("showOfferBtn");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const GEO_CORDS_KEY = "geo-loc-cords";
let showOffer = false;
let item = { cParent: null, cChild: null };
let searchArray = [];

document.addEventListener("DOMContentLoaded", () => {
  item = { cParent: null, cChild: null };
});

input.addEventListener("input", debounce(showSuggestions, 300));

// Show error message
function showError(message) {
  content.innerHTML = `
    <div class="error-message">
      <h3>⚠️ ${message}</h3>
      <p>Please try again later.</p>
    </div>
  `;
}

// Toggle Show Offer filter
showOfferBtn.onclick = () => {
  showOffer = !showOffer;
  showOfferBtn.textContent = `Show Offer: ${showOffer ? "ON" : "OFF"}`;
  showOfferBtn.classList.toggle("active", showOffer);
  if (item.cParent && item.cChild) {
    fetchProducts(item.cParent, item.cChild);
  }
};

// Toggle theme and persist
themeToggle.onclick = () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "🌞" : "🌓";
  localStorage.setItem("theme", isDark ? "dark" : "light");

  // Animate toggle icon
  themeToggle.style.transform = "rotate(360deg)";
  setTimeout(() => {
    themeToggle.style.transform = "rotate(0deg)";
  }, 300);
};

// Load theme from localStorage or default to light
function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "🌞";
  } else {
    document.body.classList.remove("dark");
    themeToggle.textContent = "🌓";
  }
}

// Geo-location and persist
function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function loadGeoLocation() {
  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000, // 10s
      maximumAge: 0,
    });
    const { latitude, longitude } = position.coords;
    const cords = { lat: latitude.toFixed(6), lon: longitude.toFixed(6) };
    localStorage.setItem(GEO_CORDS_KEY, JSON.stringify(cords));
  } catch (err) {
    showError(`Location Error: ${err.message}`);
  }
}

// Fetch categories from API
async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/category`);
    if (!res.ok) throw new Error("Failed to fetch categories");
    const catList = await res.json();
    searchArray = transformToArray(catList);
    return catList;
  } catch (error) {
    showError("Unable to load categories.");
    console.error(error);
    return [];
  }
}

function handlePagination(pagination) {
  if (pagination) {
    const queryParams = convertToQueryParams(pagination);
    loadMoreBtn.onclick = () => {
      fetchProducts(pagination.cParent, pagination.cChild, queryParams);
    };
  }
}

function appendProducts(products) {
  const content = document.getElementById("content");
  content.innerHTML += products.map((p) => `<div>${p.name}</div>`).join("");
}

// Fetch products from API
async function fetchProducts(cParent, cChild, params = null) {
  item = { cParent, cChild };
  try {
    showSkeletons(); // Show loading skeletons
    let cords = localStorage.getItem(GEO_CORDS_KEY);
    if (cords) {
      cords = JSON.parse(cords);
      const headers = {
        lat: cords.lat,
        lon: cords.lon,
      };
      console.log(params);
      const res = await fetch(
        `${API_BASE_URL}/api/product?${
          params ? params : `cParent=${cParent}&cChild=${cChild}`
        }&offer=${showOffer}`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      const { data, pagination } = await res.json();
      if (pagination) {
        loadMoreBtn.disabled = false;
        handlePagination(pagination);
      } else {
        loadMoreBtn.disabled = true;
      }
      if (data.length == 0) {
        showError("No products available.");
        return;
      }
      renderProducts(data);
    } else {
      showError("Something went wrong while loading products.");
    }
  } catch (error) {
    showError("Something went wrong while loading products.");
  }
}

// Create collapsible dropdown for each category
function createDropdown(category) {
  const wrapper = document.createElement("div");
  const heading = document.createElement("button");
  const textSpan = document.createElement("span");
  const icon = document.createElement("i");
  const subList = document.createElement("div");

  heading.className = "dropdown-toggle";
  textSpan.textContent = category.name;
  icon.className = "arrow down";

  subList.className = "dropdown-content";

  category.subCategories.forEach((sub) => {
    const subBtn = document.createElement("button");
    subBtn.textContent = sub.name;
    subBtn.onclick = () => {
      if (localStorage.getItem(GEO_CORDS_KEY)) {
        fetchProducts(category.id, sub.id);
      } else loadGeoLocation();
    };
    subList.appendChild(subBtn);
  });

  heading.appendChild(textSpan);
  heading.appendChild(icon);

  heading.onclick = () => {
    const isExpanded = subList.classList.toggle("show");
    icon.classList.remove(isExpanded ? "down" : "up");
    icon.classList.add(isExpanded ? "up" : "down");
  };

  wrapper.appendChild(heading);
  wrapper.appendChild(subList);
  sidebar.appendChild(wrapper);
}

// Render product cards
function renderProducts(products) {
  content.innerHTML = "";
  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.onclick = () => window.open(product.product_deep_link, "_blank");
    card.innerHTML = `
  <div class="product-image-container">
    <img src="${product.product_image}" alt="${product.display_name}" class="product-image">
    <div class="product-offer">${product.product_offer}</div>
  </div>
  <div class="product-details">
    <h3 class="product-name">${product.display_name}</h3>
    <div class="product-unit">${product.product_unit}</div>
    <div class="price-container">
      <span class="product-price">₹${product.product_price}</span>
      <span class="product-mrp">₹${product.product_mrp}</span>
    </div>
  </div>`;
    content.appendChild(card);
  });
}

// Show skeleton loaders
function showSkeletons(count = 4) {
  content.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-card";
    skeleton.innerHTML = `<div class="product-card skeleton">
  <div class="product-image-container skeleton-shimmer">
  </div>
  <div class="product-details">
    <h3 class="product-name skeleton-shimmer"></h3>
    <div class="product-unit skeleton-shimmer"></div>
    <div class="price-container">
      <span class="product-price skeleton-shimmer"></span>
      <span class="product-mrp skeleton-shimmer"></span>
    </div>
  </div>
</div>`;
    content.appendChild(skeleton);
  }
}

// Highlight substring matches
function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, "ig");
  return text.replace(regex, `<span class="highlight">$1</span>`);
}

function showSuggestions() {
  const query = input.value.trim();
  suggestionsBox.innerHTML = "";

  if (query.length < 3) return;

  const results = fuzzySearch(query, searchArray);

  console.log(results);

  results.forEach((result) => {
    const [cParent, cChild, item] = result.itemArray;
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.innerHTML = highlightMatch(item, query);
    div.onclick = () => {
      input.value = item;
      suggestionsBox.innerHTML = "";
      fetchProducts(cParent, cChild);
    };
    suggestionsBox.appendChild(div);
  });
}

// Initialize app
async function init() {
  const categories = await fetchCategories();
  if (categories.length === 0) {
    showError("No Category found!");
    return;
  }
  categories.forEach(createDropdown);
  loadGeoLocation();
}

loadTheme();
init();
